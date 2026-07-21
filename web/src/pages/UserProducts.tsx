import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Store,
  ArrowLeft,
  X,
  Search,
  Upload,
  Image as ImageIcon,
} from 'lucide-react'
import { mockSellerListings, type SellerProductListing } from '../features/seller/data/sellerData'

const samplePresetImages = [
  { label: 'Laptop', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80' },
  { label: 'Camera', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80' },
  { label: 'Headphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80' },
  { label: 'Chair', url: 'https://images.unsplash.com/photo-1580481072645-022f9a6d8310?w=800&auto=format&fit=crop&q=80' },
]

export function UserProducts() {
  const [listings, setListings] = useState<SellerProductListing[]>(mockSellerListings)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form states
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState<number>(500)
  const [category, setCategory] = useState('Electronics')
  const [stock, setStock] = useState<number>(1)
  const [imagePreview, setImagePreview] = useState('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80')

  const handleOpenCreate = () => {
    setEditingId(null)
    setTitle('')
    setPrice(500)
    setCategory('Electronics')
    setStock(1)
    setImagePreview(samplePresetImages[2].url)
    setShowModal(true)
  }

  const handleOpenEdit = (item: SellerProductListing) => {
    setEditingId(item.id)
    setTitle(item.title)
    setPrice(item.price)
    setCategory(item.category)
    setStock(item.stock)
    setImagePreview(item.imageUrl)
    setShowModal(true)
  }

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)
    }
  }

  const handleSaveListing = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return

    if (editingId) {
      setListings((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, title, price, category, stock, imageUrl: imagePreview }
            : item
        )
      )
    } else {
      const newListing: SellerProductListing = {
        id: `prod-${Date.now()}`,
        title,
        price,
        category,
        stock,
        views: 1,
        imageUrl: imagePreview,
        status: 'active',
      }
      setListings((prev) => [newListing, ...prev])
    }
    setShowModal(false)
  }

  const handleDeleteListing = (id: string) => {
    setListings((prev) => prev.filter((item) => item.id !== id))
  }

  const filteredListings = listings.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="py-4 sm:py-6 space-y-6">
      {/* Back link */}
      <div>
        <Link
          to="/user/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md mb-1 border border-emerald-200 dark:border-emerald-800">
            <Store size={14} />
            Seller Product Management
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Product Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Upload images, update pricing and stock levels, or publish new marketplace listings.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all cursor-pointer shrink-0"
        >
          <Plus size={18} /> Add New Listing
        </button>
      </div>

      {/* Control Bar: Search & Counter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inventory by title or category..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
          />
        </div>

        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 self-start sm:self-auto">
          Showing <strong className="text-slate-900 dark:text-white">{filteredListings.length}</strong> active products
        </span>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filteredListings.map((item) => (
          <div
            key={item.id}
            className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm space-y-3 flex flex-col justify-between hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-600 transition-all"
          >
            <div className="space-y-2">
              <div className="relative h-36 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute left-2 top-2">
                  <span className="rounded-full bg-slate-900/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-semibold text-white">
                    {item.category}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Stock: {item.stock} in stock</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Eye size={12} /> {item.views} views
                </span>
              </div>

              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-xs line-clamp-1 leading-snug">
                {item.title}
              </h3>
            </div>

            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <span className="font-display font-bold text-slate-900 dark:text-white text-sm">
                ${item.price.toLocaleString()}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(item)}
                  title="Edit Product"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => handleDeleteListing(item.id)}
                  title="Delete Product"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Listing Modal with File Upload */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-6 lg:p-8 shadow-2xl space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {editingId ? 'Edit Product Listing' : 'Add New Product Listing'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveListing} className="space-y-4 text-xs">
              {/* Image Upload Component */}
              <div className="space-y-2">
                <label className="block font-semibold uppercase text-slate-500 dark:text-slate-400">Product Image Upload</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 w-full sm:w-auto">
                    <label className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-3.5 py-2 text-xs font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer shadow-sm">
                      <Upload size={14} /> Upload Local Image File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400">PNG, JPG, WEBP up to 5MB.</p>
                  </div>
                </div>

                {/* Preset Image Options */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-400">Or pick sample:</span>
                  {samplePresetImages.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setImagePreview(preset.url)}
                      className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="block font-semibold uppercase text-slate-500 dark:text-slate-400">Product Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sony Alpha A7 IV Camera Body"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-xs sm:text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold uppercase text-slate-500 dark:text-slate-400">Price ($ USD)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-xs sm:text-sm text-slate-900 dark:text-white font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold uppercase text-slate-500 dark:text-slate-400">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold uppercase text-slate-500 dark:text-slate-400">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="Electronics">Electronics</option>
                  <option value="Collectibles">Collectibles</option>
                  <option value="Home & Office">Home & Office</option>
                  <option value="Fashion">Fashion</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all cursor-pointer"
              >
                {editingId ? 'Save Changes' : 'Publish Product to Marketplace'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
