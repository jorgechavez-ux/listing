import { supabase } from './supabase'

/**
 * Saves a generated listing to the database.
 */
export async function saveListing({ title, description, price, category, productName }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('listings')
    .insert({
      user_id: user.id,
      title,
      description,
      price,
      category,
      product_name: productName,
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Fetches all listings for the current user, newest first.
 */
export async function getUserListings() {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Deletes a listing by id.
 */
export async function deleteListing(id) {
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id)

  return { error }
}
