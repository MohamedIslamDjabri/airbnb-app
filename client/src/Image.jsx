export default function Image({ src, ...rest }) {
  if (!src) return null;

  return (
    <img {...rest} src={src} alt="" />
  );
}