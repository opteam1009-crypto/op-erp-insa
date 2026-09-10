import { ExtraWorkPage } from '../_extra-work/ExtraWorkPage'

export default function OvertimePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  return <ExtraWorkPage kind="연장근무" searchParams={searchParams} />
}
