'use client'

import styles from './LoadingBar.module.css'

export default function LoadingBar() {
  return (
    <div className={styles.wrapper} role="progressbar" aria-label="読み込み中">
      <div className={styles.bar} />
    </div>
  )
}
