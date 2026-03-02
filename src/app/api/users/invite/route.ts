import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    // 1. Verify caller is authenticated and is a super_admin
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminSupabaseClient()
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only Super Admins can invite users' }, { status: 403 })
    }

    // 2. Parse request
    const { email, role, assigned_teams, assigned_clients } = await req.json()
    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }
    if (!['super_admin', 'admin', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // 3. Check if user already exists
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }

    // 4. Create auth user via admin API
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { role },
    })
    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 400 })
    }

    // 5. Create profile row
    await admin.from('profiles').insert({
      id: newUser.user.id,
      email,
      role,
      status: 'pending',
      invited_by: user.id,
      assigned_teams: assigned_teams || [],
      assigned_clients: assigned_clients || [],
    })

    // 6. Generate invite link
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
    })

    let activationUrl = ''
    if (!linkErr && linkData) {
      // Extract the token from the generated link
      const generatedUrl = new URL(linkData.properties.action_link)
      const token = generatedUrl.searchParams.get('token') || linkData.properties.hashed_token
      const origin = req.nextUrl.origin
      activationUrl = `${origin}/activate?token=${token}&type=invite`
    }

    // 7. Send activation email via Resend
    let emailSent = false
    if (activationUrl && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const roleLabel = role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'User'

        const { error: emailErr } = await resend.emails.send({
          from: 'HKR.TEAM <onboarding@resend.dev>',
          to: email,
          subject: 'You have been invited to HKR.TEAM',
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="margin:0;padding:0;background:#FFFEF3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFEF3;padding:40px 20px;">
                <tr>
                  <td align="center">
                    <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;border:1px solid #EEECE6;overflow:hidden;">
                      <tr>
                        <td style="background:#060534;padding:28px 36px;">
                          <span style="color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:0.5px;">HKR.TEAM</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:40px 36px;">
                          <h1 style="margin:0 0 8px;font-size:24px;color:#060534;font-weight:400;">Welcome to HKR.TEAM</h1>
                          <p style="margin:0 0 28px;font-size:14px;color:#4A4A6A;line-height:1.6;">
                            You have been invited to join the HKR.TEAM Assessment Platform as <strong style="color:#060534;">${roleLabel}</strong>.
                            Click the button below to set up your account.
                          </p>
                          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                            <tr>
                              <td style="background:#060534;border-radius:100px;padding:14px 32px;">
                                <a href="${activationUrl}" style="color:#FFFEF3;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
                                  Activate Account
                                </a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:0 0 8px;font-size:12px;color:#8A8AA0;line-height:1.5;">
                            Or copy this link into your browser:
                          </p>
                          <p style="margin:0 0 28px;font-size:12px;color:#4A4A6A;word-break:break-all;background:#F7F7FD;padding:12px 16px;border-radius:8px;border:1px solid #EEECE6;">
                            ${activationUrl}
                          </p>
                          <hr style="border:none;border-top:1px solid #EEECE6;margin:28px 0;" />
                          <p style="margin:0;font-size:12px;color:#8A8AA0;line-height:1.5;">
                            This invitation link is unique to you. If you did not expect this invitation, you can safely ignore this email.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#F7F7FD;padding:20px 36px;border-top:1px solid #EEECE6;">
                          <p style="margin:0;font-size:11px;color:#8A8AA0;text-align:center;">
                            Sent by HKR.TEAM Assessment Platform
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        })

        if (!emailErr) emailSent = true
      } catch (e) {
        console.error('Resend error:', e)
      }
    }

    return NextResponse.json({
      success: true,
      userId: newUser.user.id,
      emailSent,
      activationUrl: emailSent ? undefined : activationUrl, // Return URL as fallback if email failed
    })
  } catch (err) {
    console.error('Invite API error:', err)
    return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 })
  }
}
