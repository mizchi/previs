export default function Text(props: { text: string }) {
  // Changed color to a darker shade for readability
  return <span style={{ fontWeight: 'bold', fontSize: '18px', color: 'darkslategray' }}>{props.text}</span>
}

/*@__NO_SIDE_EFFECTS__*/
export function __PREVIEW__() {
  return <Text text="Hello!" />
}