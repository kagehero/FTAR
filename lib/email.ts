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

// 雨天中止時の振替チケット発行メール送信
export async function sendCancellationTransferEmail(
  to: string,
  memberName: string,
  className: string,
  cancelledDate: string,
  expiresAt: string
): Promise<void> {
  if (!SENDGRID_API_KEY || !SENDGRID_FROM) {
    console.warn('SendGrid not configured, skipping cancellation transfer email')
    return
  }

  try {
    await sgMail.send({
      to,
      from: SENDGRID_FROM as string,
      subject: '【FTAR】雨天中止のお知らせ（振替チケットを発行しました）',
      text:
        `${memberName} 様\n\n` +
        `お世話になっております。\n\n` +
        `${cancelledDate} の ${className} は雨天中止となりました。\n` +
        `振替チケットを発行いたしましたので、別のクラスに振り替えてご参加ください。\n\n` +
        `チケット有効期限: ${expiresAt}\n\n` +
        `アプリの「振替チケット」から振替先をご選択いただけます。`,
    })
  } catch (error) {
    console.error('Failed to send cancellation transfer email:', error)
  }
}
