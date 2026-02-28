import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const { candidateName, candidateEmail, assessmentTitle, assessUrl } = await req.json()

    if (!candidateName || !candidateEmail || !assessmentTitle || !assessUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const { error } = await resend.emails.send({
      from: 'HKR.TEAM Assessments <onboarding@resend.dev>',
      to: candidateEmail,
      subject: `You've been invited to complete: ${assessmentTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#FFFEF3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFEF3;padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;border:1px solid #EEECE6;overflow:hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background:#060534;padding:28px 36px;">
                      <span style="color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:0.5px;">HKR.TEAM</span>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:40px 36px;">
                      <h1 style="margin:0 0 8px;font-size:24px;color:#060534;font-weight:400;">Assessment Invitation</h1>
                      <p style="margin:0 0 28px;font-size:14px;color:#8A8AA0;line-height:1.5;">
                        Hello ${candidateName},
                      </p>
                      <p style="margin:0 0 28px;font-size:14px;color:#4A4A6A;line-height:1.6;">
                        You have been invited to complete the <strong style="color:#060534;">${assessmentTitle}</strong> assessment.
                        Click the button below to begin.
                      </p>
                      <!-- CTA Button -->
                      <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                        <tr>
                          <td style="background:#060534;border-radius:100px;padding:14px 32px;">
                            <a href="${assessUrl}" style="color:#FFFEF3;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
                              Begin Assessment
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0 0 8px;font-size:12px;color:#8A8AA0;line-height:1.5;">
                        Or copy this link into your browser:
                      </p>
                      <p style="margin:0 0 28px;font-size:12px;color:#4A4A6A;word-break:break-all;background:#F7F7FD;padding:12px 16px;border-radius:8px;border:1px solid #EEECE6;">
                        ${assessUrl}
                      </p>
                      <hr style="border:none;border-top:1px solid #EEECE6;margin:28px 0;" />
                      <p style="margin:0;font-size:12px;color:#8A8AA0;line-height:1.5;">
                        This link is unique to you. Do not share it with anyone else.
                        If you have questions, contact your recruiter.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
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

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Invite API error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
