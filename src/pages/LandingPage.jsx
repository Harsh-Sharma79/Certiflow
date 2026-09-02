import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Award, Upload, FileSpreadsheet, Download, Zap, Shield, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Award className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">CertiFlow</span>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <Link to="/dashboard" className="btn-primary text-sm">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium text-sm">
                    Log in
                  </Link>
                  <Link to="/signup" className="btn-primary text-sm">
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            Generate certificates in seconds
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
            Generate hundreds of
            <br />
            <span className="text-primary-600">personalized certificates</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Upload your certificate template, add dynamic fields, import recipients via CSV,
            and generate hundreds of unique certificates in one click.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={user ? '/projects/new' : '/signup'}
              className="btn-primary text-lg px-8 py-4 inline-flex items-center justify-center gap-2"
            >
              Start Generating
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#how-it-works" className="btn-secondary text-lg px-8 py-4">
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything you need</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              From template design to bulk generation, CertiFlow handles it all.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Upload className="w-6 h-6" />}
              title="Upload Template"
              description="Upload your certificate design as a PNG or JPG image. It becomes the background for all generated certificates."
            />
            <FeatureCard
              icon={<FileSpreadsheet className="w-6 h-6" />}
              title="Import Recipients"
              description="Upload a CSV file with recipient names, courses, and dates. Preview the data before generating."
            />
            <FeatureCard
              icon={<Download className="w-6 h-6" />}
              title="Download All"
              description="Generate personalized certificates for every recipient and download them all as a single ZIP file."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Lightning Fast"
              description="Generate hundreds of certificates in seconds with our optimized rendering pipeline."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Secure & Private"
              description="Your data is protected with enterprise-grade security. Only you can access your projects."
            />
            <FeatureCard
              icon={<Award className="w-6 h-6" />}
              title="Visual Editor"
              description="Position dynamic fields visually with our drag-and-drop certificate editor. No coding required."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-16">How it works</h2>
          <div className="space-y-12">
            <Step number={1} title="Create a Project" description="Give your project a name, like 'Java Programming Course 2026'." />
            <Step number={2} title="Upload Your Template" description="Upload a PNG or JPG certificate design. This becomes the background." />
            <Step number={3} title="Add Dynamic Fields" description="Drag and drop fields like Name, Course, and Date onto your certificate." />
            <Step number={4} title="Upload Recipients" description="Import a CSV file with your recipient data. Preview before confirming." />
            <Step number={5} title="Generate & Download" description="Click generate and download a ZIP file with all personalized certificates." />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to streamline your certificate workflow?
          </h2>
          <p className="text-primary-100 text-lg mb-8">
            Join students, teachers, and organizations who save hours with CertiFlow.
          </p>
          <Link
            to={user ? '/projects/new' : '/signup'}
            className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-primary-50 transition-colors"
          >
            Get Started for Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-primary-600" />
            <span className="font-bold text-gray-900">CertiFlow</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2026 CertiFlow. Built for developers and educators.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function Step({ number, title, description }) {
  return (
    <div className="flex items-start gap-6">
      <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
}
