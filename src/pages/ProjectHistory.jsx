import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Award, ArrowLeft, Download, Calendar, Users, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Project History - shows project details, template preview, and download options.
 */
export default function ProjectHistory() {
  const { id } = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [recipientCount, setRecipientCount] = useState(0)
  const [loading, setLoading] = useState(true)

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

        const { count } = await supabase
          .from('recipients')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', id)

        setRecipientCount(count || 0)
      } catch (error) {
        toast.error('Failed to load project')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Project not found.</p>
          <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link to="/dashboard" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link to="/" className="flex items-center gap-2">
              <Award className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">CertiFlow</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
        {project.description && (
          <p className="text-gray-500 mb-8">{project.description}</p>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary-600" />
              <div>
                <p className="text-sm text-gray-500">Recipients</p>
                <p className="text-2xl font-bold">{recipientCount}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Generated</p>
                <p className="text-2xl font-bold">{project.certificate_count || 0}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-lg font-bold">{new Date(project.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Template Preview */}
        {project.template_url && (
          <div className="card mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Template</h3>
            <img
              src={project.template_url}
              alt="Certificate template"
              className="w-full rounded-lg border border-gray-200"
            />
          </div>
        )}

        {/* Download Section */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Download Certificates</h3>
          {project.zip_url ? (
            <div className="text-center py-8">
              <Download className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {project.certificate_count} certificates ready for download.
              </p>
              <a
                href={project.zip_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary bg-green-600 hover:bg-green-700 inline-flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download ZIP
              </a>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No certificates generated yet.</p>
              <Link
                to={`/projects/${id}`}
                className="btn-primary inline-flex items-center gap-2"
              >
                Open Editor
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
