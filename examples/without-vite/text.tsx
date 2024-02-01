export default function Text(props: { text: string }) {
  // Added smart font-family for better typography
  return (
    <span
      style={{
        fontWeight: "bold",
        fontSize: "18px",
        color: "darkslategray",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      {props.text}
    </span>
  );
}

/*@__NO_SIDE_EFFECTS__*/
export function __PREVIEW__() {
  return <Text text="Hello!" />;
}
