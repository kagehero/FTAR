import sgMail from '@sendgrid/mail'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM = process.env.SENDGRID_FROM

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY)
}

// 振替繰り上げ時メール送信
export async function sendTransferPromotionEmail(
  to: string,
  memberName: string,
  className: string,
  classDate: string,
  startTime: string
): Promise<void> {
  if (!SENDGRID_API_KEY || !SENDGRID_FROM) {
    console.warn('SendGrid not configured, skipping promotion email')
    return
  }

  try {
    await sgMail.send({
      to,
      from: SENDGRID_FROM as string,
      subject: '【FTAR】振替が確定しました',
      text:
        `${memberName} 様\n\n` +
        `キャンセル待ちしていた振替が確定しました。\n\n` +
        `クラス: ${className}\n` +
        `日付: ${classDate}\n` +
        `時間: ${startTime}\n\n` +
        `ご参加をお待ちしております。`,
    })
  } catch (error) {
    console.error('Failed to send transfer promotion email:', error)
  }
}
