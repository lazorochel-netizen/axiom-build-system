'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addJobNote(formData: FormData) {
  const vehicleId = formData.get('vehicle_id') as string
  const note      = formData.get('note') as string

  if (!note?.trim()) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  await (admin.from('activity_log') as any).insert({
    vehicle_id: vehicleId,
    user_id:    user?.id ?? null,
    action:     'note',
    new_value:  { text: note.trim() },
  })

  revalidatePath('/fitter/dashboard')
}
