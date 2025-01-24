import { useState } from 'react'
import './App.css'

function App() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [tweets, setTweets] = useState([])
  const [prompt, setPrompt] = useState('You are a social media expert and ghost writer. Generate exactly 8 complete, standalone tweets based on this blog post, matching its tone and voice closely. Each tweet should be a full thought of similar length (100-250 characters). Do not create title tweets or summaries - each tweet should provide valuable insight or a complete idea. Separate tweets with |||. Do not include any introductory text, hashtags, or emojis. Here is the blog post:')
  const [isLoading, setIsLoading] = useState(false)

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
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Content Remixer</h1>
      
      <div className="mb-4">
        <label className="block mb-2">Custom Prompt:</label>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2">Input Text:</label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full h-32 p-2 border rounded"
          placeholder="Enter text to remix..."
        />
      </div>

      <button
        onClick={handleRemix}
        disabled={isLoading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
      >
        {isLoading ? 'Remixing...' : 'Remix Text'}
      </button>

      {tweets.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3">Generated Tweets:</h2>
          <div className="grid grid-cols-2 gap-4">
            {tweets.map((tweet, index) => (
              <div 
                key={index} 
                className="p-4 bg-white border rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <p className="text-sm text-gray-800 mb-3">{tweet}</p>
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => handleTweet(tweet)}
                    className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                  >
                    Tweet This
                  </button>
                  <span className="text-xs text-gray-500">
                    {tweet.length}/280 characters
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App 