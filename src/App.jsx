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
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1 max-w-4xl p-8">
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-800">Content Remixer</h1>
          <p className="text-gray-600 mb-8">Transform your content into engaging tweets</p>
          
          <div className="space-y-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Customization Prompt</label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
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

      {/* Saved Tweets Sidebar */}
      <div className="w-96 h-screen bg-white border-l border-gray-200 overflow-y-auto fixed right-0 top-0 shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Saved Tweets</h2>
          <p className="text-sm text-gray-600 mt-1">Your tweet collection for later</p>
        </div>
        <div className="p-6 space-y-4">
          {savedTweets.map((tweet) => (
            <div 
              key={tweet.id} 
              className="p-4 bg-gray-50 border border-gray-100 rounded-xl hover:shadow-sm transition-all"
            >
              <p className="text-gray-800 mb-3 leading-relaxed">{tweet.content}</p>
              <div className="flex justify-between items-center">
                <button
                  onClick={() => handleTweet(tweet.content)}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  Tweet
                </button>
                <button
                  onClick={() => handleDeleteSavedTweet(tweet.id)}
                  className="text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {savedTweets.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
              <p className="text-lg font-medium">No saved tweets yet</p>
              <p className="text-sm">Your saved tweets will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App 