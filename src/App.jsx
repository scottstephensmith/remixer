import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [platform, setPlatform] = useState('twitter')
  const [sidebarPlatform, setSidebarPlatform] = useState('twitter')
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [tweets, setTweets] = useState([])
  const [savedPosts, setSavedPosts] = useState([])
  const [twitterPrompt, setTwitterPrompt] = useState('You are a social media expert and ghost writer. Generate exactly 8 complete, standalone tweets based on this blog post, matching its tone and voice closely. Each tweet should be a full thought of similar length (100-250 characters). Do not create title tweets or summaries - each tweet should provide valuable insight or a complete idea. Separate tweets with |||. Do not include any introductory text, hashtags, or emojis. Here is the blog post:')
  const [linkedinPrompt, setLinkedinPrompt] = useState('You are a LinkedIn content expert and professional ghostwriter. Generate 5 engaging LinkedIn posts based on this content. Each post should be 800-1200 characters, include line breaks for readability, and focus on providing professional insights or valuable business lessons. The tone should be professional yet conversational. Each post should end with a thought-provoking question to drive engagement. Separate posts with |||. Do not include hashtags or emojis. Here is the content:')
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [showPrompt, setShowPrompt] = useState(false)
  const [editingPostId, setEditingPostId] = useState(null)
  const [editingPostContent, setEditingPostContent] = useState('')
  const [savedPostIds, setSavedPostIds] = useState(new Set())

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // Fetch saved posts on component mount and when sidebarPlatform changes
    fetchSavedPosts()
  }, [sidebarPlatform])

  const fetchSavedPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_posts')
        .select('*')
        .eq('platform', sidebarPlatform)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setSavedPosts(data || [])
    } catch (error) {
      console.error('Error fetching saved posts:', error)
    }
  }

  const handleSaveTweet = async (content) => {
    try {
      const { error } = await supabase
        .from('saved_posts')
        .insert([{ 
          content,
          platform,
          user_id: session.user.id
        }])
      
      if (error) throw error
      
      // Show save animation
      setSavedPostIds(prev => new Set([...prev, content]))
      setTimeout(() => {
        setSavedPostIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(content)
          return newSet
        })
      }, 1500)
      
      // Refresh the saved posts list if we're on the same platform
      if (platform === sidebarPlatform) {
        fetchSavedPosts()
      }
    } catch (error) {
      console.error('Error saving post:', error)
    }
  }

  const handleDeleteSavedPost = async (id) => {
    try {
      const { error } = await supabase
        .from('saved_posts')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      // Refresh the saved posts list
      fetchSavedPosts()
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const handleUpdatePost = async (id) => {
    try {
      const { error } = await supabase
        .from('saved_posts')
        .update({ content: editingPostContent })
        .eq('id', id)
      
      if (error) throw error
      
      // Reset editing state
      setEditingPostId(null)
      setEditingPostContent('')
      
      // Refresh the saved posts list
      fetchSavedPosts()
    } catch (error) {
      console.error('Error updating post:', error)
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
        body: JSON.stringify({ 
          text: inputText, 
          prompt: platform === 'twitter' ? twitterPrompt : linkedinPrompt 
        }),
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
      const postArray = data.remixedText
        .split('|||')
        .map(post => post.trim())
        .filter(post => post && !post.toLowerCase().includes('here are') && !post.toLowerCase().includes('based on'))
      setTweets(postArray)
    } catch (error) {
      console.error('Error:', error)
      setOutputText(`Error: ${error.message || 'An unexpected error occurred'}`)
      setTweets([])
    }
    setIsLoading(false)
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Error signing out:', error)
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div className="flex min-h-screen relative">
      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? '' : 'pr-0'}`}>
        <div className="flex min-h-screen bg-gray-50 flex-col">
          <div className={`flex-1 p-8 transition-all duration-300 ${
            isSidebarOpen ? 'max-w-4xl' : 'max-w-4xl mx-auto'
          }`}>
            <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
              <h1 className="text-4xl font-bold mb-2 text-gray-800">Content Remixer</h1>
              <p className="text-gray-600 mb-6">Transform your content into engaging social media posts</p>

              {/* Platform Selector */}
              <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setPlatform('twitter')}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                    platform === 'twitter'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Twitter
                </button>
                <button
                  onClick={() => setPlatform('linkedin')}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                    platform === 'linkedin'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  LinkedIn
                </button>
              </div>
              
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
                        value={platform === 'twitter' ? twitterPrompt : linkedinPrompt}
                        onChange={(e) => platform === 'twitter' ? setTwitterPrompt(e.target.value) : setLinkedinPrompt(e.target.value)}
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
                      Generating {platform === 'twitter' ? 'Tweets' : 'Posts'}...
                    </span>
                  ) : `Generate ${platform === 'twitter' ? 'Tweets' : 'LinkedIn Posts'}`}
                </button>
              </div>
            </div>

            {tweets.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">
                  Generated {platform === 'twitter' ? 'Tweets' : 'LinkedIn Posts'}
                </h2>
                <div className={`grid ${platform === 'twitter' ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
                  {tweets.map((post, index) => (
                    <div 
                      key={index} 
                      className="p-6 bg-gray-50 border border-gray-100 rounded-xl hover:shadow-md transition-all"
                    >
                      <p className="text-gray-800 mb-4 leading-relaxed whitespace-pre-line">{post}</p>
                      <div className="flex justify-between items-center">
                        <div className="space-x-3">
                          <button
                            onClick={() => platform === 'twitter' ? handleTweet(post) : window.open('https://www.linkedin.com/sharing/share-offsite/?' + 
                              new URLSearchParams({
                                url: window.location.href,
                                text: post
                              }).toString(), '_blank')}
                            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            {platform === 'twitter' ? (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085a4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                                </svg>
                                Tweet
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                </svg>
                                Share
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleSaveTweet(post)}
                            disabled={savedPostIds.has(post)}
                            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                              savedPostIds.has(post)
                                ? 'bg-green-500 text-white'
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            {savedPostIds.has(post) ? (
                              <svg 
                                className="w-4 h-4 mr-2 animate-[checkmark_0.4s_ease-in-out]" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  strokeWidth="2" 
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <svg 
                                className="w-4 h-4 mr-2" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  strokeWidth="2" 
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                            )}
                            {savedPostIds.has(post) ? 'Saved!' : 'Save'}
                          </button>
                        </div>
                        <span className="text-sm text-gray-500">
                          {post.length}/{platform === 'twitter' ? '280' : '3000'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Sign Out Button - new position */}
          <div className="p-4 text-center">
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div 
        className={`${
          isSidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-300 ease-in-out overflow-hidden bg-gray-100 border-l border-gray-200 flex flex-col sticky top-0 h-screen`}
      >
        {/* Fixed header with platform selector */}
        <div className="p-4 border-b border-gray-200 bg-gray-100 sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-800 mb-3">Saved Posts</h2>
          <div className="flex space-x-1 bg-white p-1 rounded-lg w-full">
            <button
              onClick={() => setSidebarPlatform('twitter')}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                sidebarPlatform === 'twitter'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Twitter
            </button>
            <button
              onClick={() => setSidebarPlatform('linkedin')}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                sidebarPlatform === 'linkedin'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              LinkedIn
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="space-y-4">
            {savedPosts.map((post) => (
              <div 
                key={post.id}
                className="p-4 bg-white rounded-lg shadow-sm"
              >
                {editingPostId === post.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <textarea
                      value={editingPostContent}
                      onChange={(e) => setEditingPostContent(e.target.value)}
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
                        onClick={() => handleUpdatePost(post.id)}
                        className="px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingPostId(null)
                          setEditingPostContent('')
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
                    <p className="text-gray-800 mb-3 whitespace-pre-line">{post.content}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => post.platform === 'twitter' ? 
                            handleTweet(post.content) : 
                            window.open('https://www.linkedin.com/sharing/share-offsite/?' + 
                              new URLSearchParams({
                                url: window.location.href,
                                text: post.content
                              }).toString(), '_blank')}
                          className="inline-flex items-center h-8 px-3 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          {post.platform === 'twitter' ? (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085a4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                              </svg>
                              Tweet
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                              </svg>
                              Share
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingPostId(post.id)
                            setEditingPostContent(post.content)
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
                        onClick={() => handleDeleteSavedPost(post.id)}
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