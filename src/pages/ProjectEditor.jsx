import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import CertificateEditor from '../components/CertificateEditor'
import CsvUpload from '../components/CsvUpload'
import { Award, ArrowLeft, Upload, FileText, Eye, Download, Loader2, CheckCircle, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Multi-step project editor: Template Upload → Field Design → CSV Upload → Preview/Generate
 */
export default function ProjectEditor() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [step, setStep] = useState('template') // template | fields | recipients | complete
  const [loading, setLoading] = useState(true)
  const [templateFile, setTemplateFile] = useState(null)
  const [templatePreview, setTemplatePreview] = useState(null)
  const [fields, setFields] = useState([])
  const [recipients, setRecipients] = useState([])

  // Load project data
  const loadProject = useCallback(async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (projectError || !projectData) {
        toast.error('Project not found')
        navigate('/dashboard')
        return
      }

      setProject(projectData)

      if (projectData.template_url) {
        setTemplatePreview(projectData.template_url)
      }

      // Load existing fields
      const { data: fieldsData } = await supabase
        .from('certificate_fields')
        .select('*')
        .eq('project_id', id)

      if (fieldsData?.length > 0) {
        setFields(fieldsData)
      }

      // Load existing recipients
      const { data: recipientsData } = await supabase
        .from('recipients')
        .select('*')
        .eq('project_id', id)

      if (recipientsData?.length > 0) {
        setRecipients(recipientsData)
      }

      // Determine current step
      if (projectData.status === 'completed' || projectData.zip_url) {
        setStep('complete')
      } else if (recipientsData?.length > 0 && fieldsData?.length > 0) {
        setStep('complete')
      } else if (fieldsData?.length > 0) {
        setStep('recipients')
      } else if (projectData.template_url) {
        setStep('fields')
      } else {
        setStep('template')
      }
    } catch (error) {
      toast.error('Failed to load project')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [id, user, navigate])

  useEffect(() => {
    loadProject()
  }, [loadProject])

  // Handle template upload
  const handleTemplateUpload = async (file) => {
    setTemplateFile(file)
    const previewUrl = URL.createObjectURL(file)
    setTemplatePreview(previewUrl)

    try {
      const result = await api.uploadTemplate(id, file)
      setTemplatePreview(result.url)
      setProject(prev => ({ ...prev, template_url: result.url }))
      setStep('fields')
      toast.success('Template uploaded!')
    } catch (error) {
      toast.error(error.message || 'Failed to upload template')
    }
  }

  // Handle field save
  const handleFieldsSave = async (savedFields) => {
    try {
      await api.saveFields(id, savedFields)
      setFields(savedFields)
      setStep('recipients')
      toast.success('Fields saved!')
    } catch (error) {
      toast.error(error.message || 'Failed to save fields')
    }
  }

  // Handle recipients upload
  const handleRecipientsSave = async (csvContent) => {
    try {
      const result = await api.uploadRecipients(id, csvContent)
      setRecipients(result.recipients)
      setStep('complete')
      toast.success(`${result.recipients.length} recipients added!`)
    } catch (error) {
      toast.error(error.message || 'Failed to upload recipients')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) return null

  const steps = [
    { key: 'template', label: 'Upload Template', icon: Upload },
    { key: 'fields', label: 'Design Fields', icon: FileText },
    { key: 'recipients', label: 'Add Recipients', icon: FileText },
    { key: 'complete', label: 'Preview & Generate', icon: Eye },
  ]

  const currentStepIndex = steps.findIndex(s => s.key === step)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link to="/" className="flex items-center gap-2">
                <Award className="w-8 h-8 text-primary-600" />
                <span className="text-xl font-bold text-gray-900">CertiFlow</span>
              </Link>
            </div>
            <h1 className="text-sm font-medium text-gray-600 hidden sm:block">{project.name}</h1>
          </div>
        </div>
      </header>

      {/* Step Progress */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => {
              const Icon = s.icon
              const isActive = s.key === step
              const isCompleted = i < currentStepIndex
              return (
                <div key={s.key} className="flex items-center">
                  <div className={`flex items-center gap-2 ${isActive ? 'text-primary-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                    <span className={`text-sm font-medium hidden sm:block ${isActive ? 'text-primary-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-8 sm:w-16 h-0.5 mx-2 ${i < currentStepIndex ? 'bg-green-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: Template Upload */}
        {step === 'template' && (
          <TemplateUploadStep
            project={project}
            templatePreview={templatePreview}
            onUpload={handleTemplateUpload}
          />
        )}

        {/* Step 2: Field Editor */}
        {step === 'fields' && (
          <CertificateEditor
            templateUrl={templatePreview || project.template_url}
            initialFields={fields}
            onSave={handleFieldsSave}
            onBack={() => setStep('template')}
          />
        )}

        {/* Step 3: CSV Upload */}
        {step === 'recipients' && (
          <CsvUploadStep
            project={project}
            existingRecipients={recipients}
            onUpload={handleRecipientsSave}
            onBack={() => setStep('fields')}
          />
        )}

        {/* Step 4: Preview & Generate */}
        {step === 'complete' && (
          <CompleteStep
            project={project}
            fields={fields}
            recipients={recipients}
            onRegenerate={() => {
              setStep('template')
              setFields([])
              setRecipients([])
            }}
          />
        )}
      </main>
    </div>
  )
}

// ========================
// Template Upload Step
// ========================
function TemplateUploadStep({ project, templatePreview, onUpload }) {
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Please upload a PNG or JPG image')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB')
      return
    }

    setUploading(true)
    await onUpload(file)
    setUploading(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Certificate Template</h2>
      <p className="text-gray-500 mb-8">Upload a PNG or JPG image that will serve as the background for all certificates.</p>

      {templatePreview ? (
        <div className="space-y-6">
          <div className="card">
            <p className="text-sm font-medium text-gray-700 mb-3">Current Template</p>
            <img
              src={templatePreview}
              alt="Certificate template"
              className="w-full rounded-lg border border-gray-200"
            />
          </div>
          <div className="flex gap-4">
            <label className="btn-secondary flex-1 text-center cursor-pointer">
              <input type="file" accept=".png,.jpg,.jpeg" onChange={handleFileSelect} className="hidden" />
              {uploading ? 'Uploading...' : 'Replace Template'}
            </label>
          </div>
        </div>
      ) : (
        <label className="card block cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all border-2 border-dashed border-gray-300 text-center py-16">
          <input type="file" accept=".png,.jpg,.jpeg" onChange={handleFileSelect} className="hidden" />
          {uploading ? (
            <div>
              <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Uploading template...</p>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-1">Click to upload certificate template</p>
              <p className="text-sm text-gray-400">PNG or JPG, max 10MB</p>
            </div>
          )}
        </label>
      )}
    </div>
  )
}

// ========================
// CSV Upload Step
// ========================
function CsvUploadStep({ project, existingRecipients, onUpload, onBack }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Add Recipients</h2>
          <p className="text-gray-500">Upload a CSV file with recipient data (Name, Course, Date columns required).</p>
        </div>
        <button onClick={onBack} className="btn-secondary text-sm">
          Back
        </button>
      </div>
      <CsvUpload
        projectId={project.id}
        existingRecipients={existingRecipients}
        onUpload={onUpload}
      />
    </div>
  )
}

// ========================
// Complete Step
// ========================
function CompleteStep({ project, fields, recipients, onRegenerate }) {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto text-center">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Ready!</h2>
      <p className="text-gray-500 mb-8">
        {recipients.length} recipients ready for certificate generation.
      </p>

      <div className="card text-left mb-8">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Project</p>
            <p className="font-medium">{project.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Template</p>
            <p className="font-medium">{project.template_url ? '✓ Uploaded' : '✗ Missing'}</p>
          </div>
          <div>
            <p className="text-gray-500">Fields</p>
            <p className="font-medium">{fields.length} configured</p>
          </div>
          <div>
            <p className="text-gray-500">Recipients</p>
            <p className="font-medium">{recipients.length} loaded</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => navigate(`/projects/${project.id}/preview`)}
          className="btn-primary inline-flex items-center justify-center gap-2"
        >
          <Eye className="w-5 h-5" />
          Preview Certificate
        </button>
        <button
          onClick={() => navigate(`/projects/${project.id}/generate`)}
          className="btn-primary inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
        >
          <Download className="w-5 h-5" />
          Generate All Certificates
        </button>
        <button onClick={onRegenerate} className="btn-secondary">
          Start Over
        </button>
      </div>

      {project.zip_url && (
        <div className="mt-8">
          <a
            href={project.zip_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Download className="w-5 h-5" />
            Download ZIP
          </a>
        </div>
      )}
    </div>
  )
}
