export default function DealerAnnouncement({ message }) {
  const text = message || '';

  return (
    <div
      style={{
        width: '100%',
        height: '32px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '0.75rem',
        paddingRight: '0.75rem',
      }}
    >
      {text && (
        <span
          style={{
            fontFamily: 'Oswald, sans-serif',
            fontSize: '0.8rem',
            fontWeight: 700,
            fontStyle: 'italic',
            lineHeight: '32px',
            height: '32px',
            transform: 'skewX(-8deg)',
            display: 'block',
            color: '#f6d860',
            textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 0 6px rgba(180,130,40,0.4)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
}