import { useState } from 'react'
import './App.css'

function App() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [prompt, setPrompt] = useState('Rewrite this in a fun and playful tone')
  const [isLoading, setIsLoading] = useState(false)

  const handleRemix = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/src/api/remix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText, prompt }),
      })
      const data = await response.json()
      setOutputText(data.remixedText)
    } catch (error) {
      console.error('Error:', error)
      setOutputText('Error occurred while remixing text')
    }
    setIsLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
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

      <div className="mt-4">
        <label className="block mb-2">Remixed Output:</label>
        <textarea
          value={outputText}
          readOnly
          className="w-full h-32 p-2 border rounded bg-gray-50"
        />
      </div>
    </div>
  )
}

export default App 