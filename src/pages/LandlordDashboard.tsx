import { Link } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'

export default function LandlordDashboard() {
  const { role } = useAuthContext()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-site mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Landlord dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              {role === 'admin'
                ? 'Platform admin — create listings on behalf of landlords or open the admin panel.'
                : 'Manage your listings and enquiries.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/landlord/property/new"
              className="inline-flex items-center justify-center rounded-xl bg-gray-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-gray-800"
            >
              Add new listing
            </Link>
            {role === 'admin' && (
              <Link
                to="/admin"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Admin panel
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-sm text-gray-600">
          <p>
            Listing management tools will grow here. For now, use <strong>Add new listing</strong> to create a
            property, or visit the public{' '}
            <Link to="/listings" className="text-indigo-600 font-medium hover:text-indigo-800">
              listings
            </Link>{' '}
            page to preview how students see your properties.
          </p>
        </div>
      </div>
    </div>
  )
}
