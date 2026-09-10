import { ExtraWorkPage } from '../_extra-work/ExtraWorkPage'

export default function HolidayWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  return <ExtraWorkPage kind="휴일근무" searchParams={searchParams} />
}
