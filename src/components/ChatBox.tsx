import { useState, useRef } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const ChatBox = () => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && files.length === 0) return;
    
    // TODO: Handle message and file submission
    console.log('Message:', message);
    console.log('Files:', files);
    
    // Reset form
    setMessage('');
    setFiles([]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="glass-chat rounded-2xl p-6 space-y-4">
      {/* Suggestion Text */}
      <div className="text-center">
        <p className="text-muted-foreground text-sm">
          Describe your company challenge, & describe the person you are looking for
        </p>
      </div>

      {/* File Upload Area */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Attached files:</p>
          <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm"
              >
                <span className="truncate max-w-32">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask me anything about your hiring needs..."
            className="glass-input resize-none min-h-24 pr-20 text-foreground placeholder:text-muted-foreground"
            rows={3}
          />
          
          {/* File Upload Button */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 w-8 p-0 hover-glow"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Button
              type="submit"
              size="sm"
              className="h-8 w-8 p-0 bg-primary hover:bg-primary/80 hover-glow"
              disabled={!message.trim() && files.length === 0}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>

      {/* Chat Messages Area - Placeholder for future implementation */}
      <div className="min-h-32 rounded-lg bg-muted/20 border border-border/50 p-4 text-center text-muted-foreground text-sm">
        Your conversation will appear here...
      </div>
    </div>
  );
};

export default ChatBox;