import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { renderCertificate } from '../utils/certificateGenerator'
import { Award, ArrowLeft, Download, CheckCircle, Loader2, AlertCircle, FileArchive } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Generation Progress - generates all certificates in the browser,
 * packages them into a ZIP, and uploads to Supabase Storage.
 *
 * Processes in batches of BATCH_SIZE to stay within memory limits.
 */
const BATCH_SIZE = 10

export default function GenerationProgress() {
  const { id } = useParams()
  const { user } = useAuth()

  const [project, setProject] = useState(null)
  const [fields, setFields] = useState([])
  const [recipients, setRecipients] = useState([])
  const [status, setStatus] = useState('loading') // loading | generating | packaging | uploading | complete | error
  const [progress, setProgress] = useState(0)
  const [generatedCount, setGeneratedCount] = useState(0)
  const [zipUrl, setZipUrl] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [certBlob, setCertBlob] = useState(null)

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
          setErrorMessage('Project not found')
          setStatus('error')
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

        if (!projectData.template_url) {
          setErrorMessage('No template uploaded')
          setStatus('error')
          return
        }
        if (!fieldsData?.length) {
          setErrorMessage('No certificate fields configured')
          setStatus('error')
          return
        }
        if (!recipientsData?.length) {
          setErrorMessage('No recipients uploaded')
          setStatus('error')
          return
        }
      } catch (error) {
        setErrorMessage('Failed to load project')
        setStatus('error')
      }
    }
    load()
  }, [id, user])

  /**
   * Start the generation process.
   * Generates certificates as PNG data URLs, then creates a ZIP.
   */
  const startGeneration = useCallback(async () => {
    if (!project || fields.length === 0 || recipients.length === 0) return

    setStatus('generating')
    setProgress(0)

    try {
      // Dynamically import JSZip
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const folder = zip.folder('certificates')

      const total = recipients.length

      // Process in batches to avoid memory issues
      for (let batchStart = 0; batchStart < total; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, total)
        const batch = recipients.slice(batchStart, batchEnd)

        for (let i = 0; i < batch.length; i++) {
          const recipient = batch[i]
          const data = recipient.data || recipient

          // Render certificate as PNG data URL
          const dataUrl = await renderCertificate(project.template_url, fields, data)

          // Convert data URL to blob
          const response = await fetch(dataUrl)
          const blob = await response.blob()

          // Create safe filename
          const safeName = (data.name || 'Certificate')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50)

          folder.file(`${safeName}_Certificate.png`, blob)

          setGeneratedCount(batchStart + i + 1)
          setProgress(Math.round(((batchStart + i + 1) / total) * 100))
        }
      }

      // Generate ZIP
      setStatus('packaging')
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      setCertBlob(zipBlob)

      // Upload ZIP to Supabase Storage
      setStatus('uploading')
      const zipPath = `${user.id}/${id}/certificates.zip`

      const { error: uploadError } = await supabase.storage
        .from('generated')
        .upload(zipPath, zipBlob, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('generated')
        .getPublicUrl(zipPath)

      // Update project
      await supabase
        .from('projects')
        .update({
          zip_url: urlData.publicUrl,
          certificate_count: total,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      setZipUrl(urlData.publicUrl)
      setStatus('complete')
      toast.success(`Generated ${total} certificates!`)
    } catch (error) {
      console.error('Generation failed:', error)
      setErrorMessage(error.message || 'Certificate generation failed')
      setStatus('error')
      toast.error('Generation failed')

      // Update project status
      await supabase
        .from('projects')
        .update({ status: 'error' })
        .eq('id', id)
    }
  }, [project, fields, recipients, id, user])

  // Auto-start generation when data is loaded
  useEffect(() => {
    if (project && fields.length > 0 && recipients.length > 0 && status === 'loading') {
      startGeneration()
    }
  }, [project, fields, recipients, status, startGeneration])

  const handleDownloadZip = () => {
    if (zipUrl) {
      window.open(zipUrl, '_blank')
    } else if (certBlob) {
      const url = URL.createObjectURL(certBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project?.name || 'Certificates'}_All.zip`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link to={`/projects/${id}`} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link to="/" className="flex items-center gap-2">
              <Award className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">CertiFlow</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Loading State */}
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-primary-600 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading project...</h2>
            <p className="text-gray-500">Preparing certificate generation</p>
          </div>
        )}

        {/* Generating */}
        {status === 'generating' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-primary-600 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Generating Certificates</h2>
            <p className="text-gray-500 mb-6">
              {generatedCount} of {recipients.length} certificates generated
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">{progress}% complete</p>
          </div>
        )}

        {/* Packaging */}
        {status === 'packaging' && (
          <div className="text-center">
            <FileArchive className="w-16 h-16 text-primary-600 mx-auto mb-6 animate-pulse" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Creating ZIP Archive</h2>
            <p className="text-gray-500">Packaging {recipients.length} certificates...</p>
          </div>
        )}

        {/* Uploading */}
        {status === 'uploading' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-primary-600 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Uploading ZIP</h2>
            <p className="text-gray-500">Uploading to cloud storage...</p>
          </div>
        )}

        {/* Complete */}
        {status === 'complete' && (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Generation Complete!</h2>
            <p className="text-gray-500 mb-8">
              Successfully generated {recipients.length} certificates.
            </p>

            <div className="card mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Project</p>
                  <p className="font-medium">{project?.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Certificates</p>
                  <p className="font-medium">{recipients.length}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadZip}
              className="btn-primary bg-green-600 hover:bg-green-700 inline-flex items-center gap-2 text-lg px-8 py-4"
            >
              <Download className="w-5 h-5" />
              Download All Certificates (ZIP)
            </button>

            <div className="mt-6 flex justify-center gap-4">
              <Link to={`/projects/${id}`} className="btn-secondary text-sm">
                Back to Editor
              </Link>
              <Link to="/dashboard" className="btn-secondary text-sm">
                Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Generation Failed</h2>
            <p className="text-red-600 mb-8">{errorMessage}</p>

            <div className="flex justify-center gap-4">
              <button onClick={startGeneration} className="btn-primary">
                Retry Generation
              </button>
              <Link to={`/projects/${id}`} className="btn-secondary">
                Back to Editor
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
