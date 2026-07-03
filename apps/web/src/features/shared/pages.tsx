import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { Button, Card } from '../../components/ui'
export function LandingPage(){return <div className="landing"><header><div className="brand"><span className="brand-mark">E</span>Edvixa</div><nav><Link to="/login">Login</Link><Link to="/register"><Button>Get Started</Button></Link></nav></header><main><span className="eyebrow">AI-powered learning platform</span><h1>Personalised practice.<br/>Real teacher support.</h1><p>Build mastery with adaptive AI practice, progress insights, and one-to-one sessions with approved teachers.</p><div className="button-row"><Link to="/register"><Button>Start Learning</Button></Link><Link to="/student/teachers"><Button className="button-secondary">Explore Teachers</Button></Link></div></main></div>}
export function AccessDeniedPage(){return <SystemPage code="403" title="Access denied" text="Your account role does not have permission to open this page."/>}
export function NotFoundPage(){return <SystemPage code="404" title="Page not found" text="The page you requested does not exist."/>}

export function RouteErrorPage(){
  const error=useRouteError()
  const message=isRouteErrorResponse(error)?error.statusText:error instanceof Error?error.message:'An unexpected application error occurred.'
  return <SystemPage code={isRouteErrorResponse(error)?String(error.status):'500'} title="Something went wrong" text={message}/>
}
function SystemPage({code,title,text}:{code:string;title:string;text:string}){return <div className="system-page"><Card><strong className="error-code">{code}</strong><h1>{title}</h1><p className="muted">{text}</p><Link to="/"><Button>Go Home</Button></Link></Card></div>}
