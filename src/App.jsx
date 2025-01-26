import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

function App() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [tweets, setTweets] = useState([])
  const [savedTweets, setSavedTweets] = useState([])
  const [prompt, setPrompt] = useState('You are a social media expert and ghost writer. Generate exactly 8 complete, standalone tweets based on this blog post, matching its tone and voice closely. Each tweet should be a full thought of similar length (100-250 characters). Do not create title tweets or summaries - each tweet should provide valuable insight or a complete idea. Separate tweets with |||. Do not include any introductory text, hashtags, or emojis. Here is the blog post:')
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [showPrompt, setShowPrompt] = useState(false)
  const [editingTweetId, setEditingTweetId] = useState(null)
  const [editingTweetContent, setEditingTweetContent] = useState('')

  // Fetch saved tweets on component mount
  useEffect(() => {
    fetchSavedTweets()
  }, [])

  const fetchSavedTweets = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_tweets')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setSavedTweets(data || [])
    } catch (error) {
      console.error('Error fetching saved tweets:', error)
    }
  }

  const handleSaveTweet = async (tweet) => {
    try {
      const { error } = await supabase
        .from('saved_tweets')
        .insert([{ content: tweet }])
      
      if (error) throw error
      
      // Refresh the saved tweets list
      fetchSavedTweets()
    } catch (error) {
      console.error('Error saving tweet:', error)
    }
  }

  const handleDeleteSavedTweet = async (id) => {
    try {
      const { error } = await supabase
        .from('saved_tweets')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      // Refresh the saved tweets list
      fetchSavedTweets()
    } catch (error) {
      console.error('Error deleting tweet:', error)
    }
  }

  const handleUpdateTweet = async (id) => {
    try {
      const { error } = await supabase
        .from('saved_tweets')
        .update({ content: editingTweetContent })
        .eq('id', id)
      
      if (error) throw error
      
      // Reset editing state
      setEditingTweetId(null)
      setEditingTweetContent('')
      
      // Refresh the saved tweets list
      fetchSavedTweets()
    } catch (error) {
      console.error('Error updating tweet:', error)
    }
  }

  const handleTweet = (tweet) => {
    const tweetText = encodeURIComponent(tweet)
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank')
  }

  const handleRemix = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/remix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText, prompt }),
      })
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server response was not JSON')
      }

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Server error occurred')
      }
      
      setOutputText(data.remixedText)
      // Split the response and clean up any potential preamble
      const tweetArray = data.remixedText
        .split('|||')
        .map(tweet => tweet.trim())
        .filter(tweet => tweet && !tweet.toLowerCase().includes('here are') && !tweet.toLowerCase().includes('based on'))
      setTweets(tweetArray)
    } catch (error) {
      console.error('Error:', error)
      setOutputText(`Error: ${error.message || 'An unexpected error occurred'}`)
      setTweets([])
    }
    setIsLoading(false)
  }

  return (
    <div className="flex h-screen relative">
      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? '' : 'pr-0'}`}>
        <div className="flex min-h-screen bg-gray-50">
          <div className={`flex-1 p-8 transition-all duration-300 ${
            isSidebarOpen ? 'max-w-4xl' : 'max-w-4xl mx-auto'
          }`}>
            <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
              <h1 className="text-4xl font-bold mb-2 text-gray-800">Content Remixer</h1>
              <p className="text-gray-600 mb-8">Transform your content into engaging tweets</p>
              
              <div className="space-y-6">
                <div className="mb-6">
                  <button
                    onClick={() => setShowPrompt(!showPrompt)}
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                  >
                    <svg 
                      className={`w-4 h-4 mr-1 transition-transform ${showPrompt ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    Customize Prompt?
                  </button>
                  
                  {showPrompt && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Customization Prompt</label>
                      <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Content</label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full h-40 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Paste your content here..."
                  />
                </div>

                <button
                  onClick={handleRemix}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Tweets...
                    </span>
                  ) : 'Generate Tweets'}
                </button>
              </div>
            </div>

            {tweets.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Generated Tweets</h2>
                <div className="grid grid-cols-2 gap-6">
                  {tweets.map((tweet, index) => (
                    <div 
                      key={index} 
                      className="p-6 bg-gray-50 border border-gray-100 rounded-xl hover:shadow-md transition-all"
                    >
                      <p className="text-gray-800 mb-4 leading-relaxed">{tweet}</p>
                      <div className="flex justify-between items-center">
                        <div className="space-x-3">
                          <button
                            onClick={() => handleTweet(tweet)}
                            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                            </svg>
                            Tweet
                          </button>
                          <button
                            onClick={() => handleSaveTweet(tweet)}
                            className="inline-flex items-center px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            Save
                          </button>
                        </div>
                        <span className="text-sm text-gray-500">
                          {tweet.length}/280
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div 
        className={`${
          isSidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-300 ease-in-out overflow-hidden bg-gray-100 border-l border-gray-200 flex flex-col h-screen`}
      >
        {/* Fixed header */}
        <div className="p-4 border-b border-gray-200 bg-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Saved Tweets</h2>
        </div>

        {/* Scrollable content */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="space-y-4">
            {savedTweets.map((tweet) => (
              <div 
                key={tweet.id}
                className="p-4 bg-white rounded-lg shadow-sm"
              >
                {editingTweetId === tweet.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <textarea
                      value={editingTweetContent}
                      onChange={(e) => setEditingTweetContent(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      style={{ minHeight: '240px', height: 'auto' }}
                      onInput={(e) => {
                        // Auto-adjust height
                        e.target.style.height = 'auto'
                        e.target.style.height = (e.target.scrollHeight) + 'px'
                      }}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdateTweet(tweet.id)}
                        className="px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingTweetId(null)
                          setEditingTweetContent('')
                        }}
                        className="px-3 py-1 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <p className="text-gray-800 mb-3">{tweet.content}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleTweet(tweet.content)}
                          className="inline-flex items-center h-8 px-3 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085a4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                          </svg>
                          Tweet
                        </button>
                        <button
                          onClick={() => {
                            setEditingTweetId(tweet.id)
                            setEditingTweetContent(tweet.content)
                          }}
                          className="inline-flex items-center h-8 px-3 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteSavedTweet(tweet.id)}
                        className="text-red-500 hover:text-red-600 h-8 px-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed toggle button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 right-4 z-20 p-2 bg-gray-200 rounded-full hover:bg-gray-300 shadow-md"
      >
        {isSidebarOpen ? '→' : '←'}
      </button>
    </div>
  )
}

export default App 