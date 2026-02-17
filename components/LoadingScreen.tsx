'use client'

import LoadingBar from './LoadingBar'
import styles from './LoadingScreen.module.css'

interface LoadingScreenProps {
  message?: string
}

export default function LoadingScreen({ message = '読み込み中...' }: LoadingScreenProps) {
  return (
    <div className={styles.container}>
      <LoadingBar />
      <div className={styles.content}>{message}</div>
    </div>
  )
}
