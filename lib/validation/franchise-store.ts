import { z } from 'zod'

export const franchiseStoreSchema = z.object({
  name: z.string().min(1, '가맹점명은 필수입니다'),
})

export type FranchiseStoreInput = z.infer<typeof franchiseStoreSchema>
