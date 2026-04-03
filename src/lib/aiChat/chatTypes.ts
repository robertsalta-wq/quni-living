export type ChatRole = 'user' | 'assistant'

export type PersonaKey = 'student_renter' | 'landlord' | 'visitor'

export type ChatMessage = {
  role: ChatRole
  content: string
}

export type ListingContext = {
  listingIds?: string[]
  propertyId?: string
  sourcePage?: 'listings' | 'property_detail'
}

export type ChatRequest = {
  messages: ChatMessage[]
  userMessage: string
  listingContext?: ListingContext
  /** Browser-fetched listing facts for student_renter (Edge has no DB). */
  listingContextBlock?: string
  firstName?: string
  /** Must match `usePersona` when JWT metadata.role is missing. */
  chatPersona?: PersonaKey
  visitorSessionId?: string
  turnstileToken?: string
  conversationId?: string
  accessToken?: string
}

export type ChatRateLimitedError = {
  error: 'rate_limited'
  message: string
}

export type ChatCaptchaErrors = {
  error: 'captcha_required' | 'captcha_failed' | 'captcha_required' | 'captcha_precheck_failed'
  message?: string
}

export type ChatServerError = {
  error: string
  message?: string
}

export type ChatErrorResponse = ChatRateLimitedError | ChatCaptchaErrors | ChatServerError

export type UseChatStreamArgs = ChatRequest

export type ChatStreamState = 'idle' | 'streaming' | 'done' | 'error'

export type UseChatStreamResult = {
  state: ChatStreamState
  assistantText: string
  error: string | null
  sendMessage: (args: UseChatStreamArgs) => Promise<void>
  abort: () => void
}

