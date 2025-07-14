import { redirect } from 'next/navigation';

export default function Page() {
  // This route is disabled because the template DB is not used.
  // Redirect to the main chat page or show a placeholder.
  redirect('/');
  return null;
}
