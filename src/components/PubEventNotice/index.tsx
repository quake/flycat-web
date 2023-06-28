import { Modal } from 'antd';
import { PubEventResultStream } from 'core/worker/sub';
import styles from './index.module.scss';

export async function noticePubEventResult(handler: PubEventResultStream) {
  const result: React.JSX.Element[] = [];
  for await (const h of handler) {
    const item = (
      <li className={styles.item}>
        <span>{h.relayUrl}</span>
        <span className={h.isSuccess ? styles.success : styles.failed}>
          {h.isSuccess ? 'success' : 'failed, reason: ' + h.reason}
        </span>
      </li>
    );
    result.push(item);
  }
  handler.unsubscribe();
  Modal.info({
    title: handler.eventId,
    content: <div>{result}</div>,
  });
}
