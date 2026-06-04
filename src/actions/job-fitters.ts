'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { emailFitterAssigned } from '@/lib/email'

export async function assignFitterToJob(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId = formData.get('vehicle_id') as string
  const userId    = formData.get('user_id') as string

  await supabase.from('job_fitters').upsert({ vehicle_id: vehicleId, user_id: userId })

  // Send assignment email to fitter
  const [{ data: fitter }, { data: vehicle }] = await Promise.all([
    supabase.from('users').select('name, email').eq('id', userId).single(),
    supabase.from('vehicles').select('job_id, vehicle_year, vehicle_make, vehicle_model, build_type').eq('id', vehicleId).single(),
  ])

  if (fitter?.email && vehicle) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://axiom-build-system.vercel.app'
    await emailFitterAssigned({
      fitterEmail:  fitter.email,
      fitterName:   fitter.name,
      jobId:        vehicle.job_id,
      vehicleYear:  vehicle.vehicle_year,
      vehicleMake:  vehicle.vehicle_make,
      vehicleModel: vehicle.vehicle_model,
      buildType:    vehicle.build_type,
      jobUrl:       `${baseUrl}/ops/jobs/${vehicleId}`,
    })
  }

  revalidatePath(`/ops/jobs/${vehicleId}`)
}

export async function removeFitterFromJob(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vehicleId = formData.get('vehicle_id') as string
  const userId    = formData.get('user_id') as string

  await supabase.from('job_fitters').delete().eq('vehicle_id', vehicleId).eq('user_id', userId)
  revalidatePath(`/ops/jobs/${vehicleId}`)
}
