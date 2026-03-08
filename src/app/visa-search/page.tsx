import { redirect } from 'next/navigation';

interface SearchParams {
    passport?: string;
    destination?: string;
}

export default async function VisaSearch({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const params = await searchParams;
    const { passport, destination } = params;

    // If both are selected, redirect to the exact visa page
    if (passport && destination) {
        redirect(`/visa/${passport}/${destination}`);
    }

    // Otherwise redirect home
    redirect('/');
}
