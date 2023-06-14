import { red } from '@mui/material/colors';
import { Paths } from 'constants/path';
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material';
import { calculateReadTime, formatDate, formatLongDate } from 'service/helper';
import { useTimeSince } from 'hooks/useTimeSince';
import { payLnUrlInWebLn } from 'service/lighting/lighting';
import { useReadonlyMyPublicKey } from 'hooks/useMyPublicKey';

import Link from 'next/link';
import styles from './index.module.scss';
import EditIcon from '@mui/icons-material/Edit';
import ReactMarkdown from 'react-markdown';
import ElectricBoltOutlinedIcon from '@mui/icons-material/ElectricBoltOutlined';
import { Avatar, Button } from 'antd';
import PostReactions from 'components/PostItems/PostReactions';
import { worker } from 'cluster';

const PostContent = ({
  article,
  publicKey,
  userMap,
  articleId,
  content,
  t,
}) => {
  const theme = useTheme();
  const myPublicKey = useReadonlyMyPublicKey();

  return (
    <div className={styles.postContent}>
      <div className={styles.postHeader}>
        {article?.image && (
          <img
            src={article.image}
            className={styles.banner}
            alt={article?.title}
          />
        )}
        <div className={styles.postTitleInfo}>
          <div className={styles.title}>{article?.title}</div>
          {article?.summary && (
            <div className={styles.summary}>{article.summary}</div>
          )}
          <div className={styles.author}>
            <div className={styles.info}>
              <div className={styles.img}>
                <Link href={Paths.user + publicKey}>
                  <Avatar
                    src={userMap.get(publicKey)?.picture}
                    style={{ width: '100%', height: '100%' }}
                  />
                </Link>
              </div>
              <div className={styles.text}>
                <div className={styles.username}>
                  <Link href={Paths.user + publicKey}>
                    {userMap.get(publicKey)?.name}
                  </Link>
                </div>
                <div className={styles.time}>
                  {article && (
                    <span>
                      {calculateReadTime(article.content)}
                      {' read • '}
                      {formatLongDate(
                        article.published_at || article.updated_at,
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div>
              {publicKey !== myPublicKey && <Button>{'follow'}</Button>}
              {publicKey === myPublicKey && (
                <Link href={`${Paths.edit + publicKey}/${articleId}`}>
                  <Button>{'Edit this post'}</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReactMarkdown
        components={{
          img: ({ node, ...props }) => (
            <img className={styles.articleImg} {...props} />
          ),
        }}
      >
        {content ?? ''}
      </ReactMarkdown>

      <div className={styles.postTags}>
        {article?.hashTags?.flat(Infinity).map((t, key) => (
          <span key={key}>#{t}</span>
        ))}
      </div>
    </div>
  );
};

export default PostContent;
