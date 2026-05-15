export async function getServerSideProps() {
  return { redirect: { destination: '/dt', permanent: false } };
}
export default function Home() { return null; }
