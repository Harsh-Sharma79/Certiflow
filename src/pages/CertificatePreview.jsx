import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { renderCertificate } from '../utils/certificateGenerator'
import { Award, ArrowLeft, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Certificate Preview - preview any recipient's certificate with the saved field layout.
 */
export default function CertificatePreview() {
  const { id } = useParams()
  const { user } = useAuth()

  const [project, setProject] = useState(null)
  const [fields, setFields] = useState([])
  const [recipients, setRecipients] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rendering, setRendering] = useState(false)

  // Load project data
  useEffect(() => {
    async function load() {
      try {
        const { data: projectData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single()

        if (!projectData) {
          toast.error('Project not found')
          return
        }
        setProject(projectData)

        const { data: fieldsData } = await supabase
          .from('certificate_fields')
          .select('*')
          .eq('project_id', id)
        setFields(fieldsData || [])

        const { data: recipientsData } = await supabase
          .from('recipients')
          .select('*')
          .eq('project_id', id)
        setRecipients(recipientsData || [])
      } catch (error) {
        toast.error('Failed to load project')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, user])

  // Render preview when recipient changes
  const generatePreview = useCallback(async () => {
    if (!project?.template_url || fields.length === 0 || recipients.length === 0) return
    setRendering(true)
    try {
      const recipient = recipients[currentIndex]
      const recipientData = recipient.data || recipient
      const url = await renderCertificate(project.template_url, fields, recipientData)
      setPreviewUrl(url)
    } catch (error) {
      toast.error('Failed to render preview')
    } finally {
      setRendering(false)
    }
  }, [project, fields, recipients, currentIndex])

  useEffect(() => {
    if (project && fields.length > 0 && recipients.length > 0) {
      generatePreview()
    }
  }, [generatePreview, project, fields, recipients])

  const handleDownload = () => {
    if (!previewUrl) return
    const recipient = recipients[currentIndex]
    const data = recipient.data || recipient
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = `${(data.name || 'Certificate').replace(/[^a-zA-Z0-9]/g, '_')}_Certificate.png`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project || recipients.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No project data found.</p>
          <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  const recipient = recipients[currentIndex]
  const data = recipient?.data || recipient || {}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to={`/projects/${id}`} className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link to="/" className="flex items-center gap-2">
                <Award className="w-8 h-8 text-primary-600" />
                <span className="text-xl font-bold text-gray-900">CertiFlow</span>
              </Link>
            </div>
            <button onClick={handleDownload} className="btn-primary text-sm flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download Preview
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Certificate Preview</h1>

        {/* Preview Card */}
        <div className="card mb-6">
          <div className="flex justify-center items-center min-h-[400px] bg-gray-100 rounded-lg overflow-hidden">
            {rendering ? (
              <div className="text-center py-16">
                <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500">Rendering preview...</p>
              </div>
            ) : previewUrl ? (
              <img src={previewUrl} alt="Certificate preview" className="max-w-full max-h-[600px] object-contain" />
            ) : (
              <p className="text-gray-400">No preview available</p>
            )}
          </div>
        </div>

        {/* Recipient Navigation */}
        <div className="card">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-500">Recipient</p>
              <p className="text-lg font-bold text-gray-900">
                {data.name || 'Unknown'}
              </p>
              <p className="text-sm text-gray-500">{data.course} • {data.date}</p>
            </div>

            <button
              onClick={() => setCurrentIndex(Math.min(recipients.length - 1, currentIndex + 1))}
              disabled={currentIndex === recipients.length - 1}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              {currentIndex + 1} of {recipients.length} recipients
            </p>
            <input
              type="range"
              min={0}
              max={recipients.length - 1}
              value={currentIndex}
              onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
              className="w-full max-w-md mt-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <Link to={`/projects/${id}`} className="btn-secondary">
            Back to Editor
          </Link>
          <Link
            to={`/projects/${id}/generate`}
            className="btn-primary bg-green-600 hover:bg-green-700"
          >
            Generate All Certificates
          </Link>
        </div>
      </main>
    </div>
  )
}
