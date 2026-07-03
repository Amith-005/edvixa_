import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, ReactNode } from 'react'
export function Button({ className='', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`button ${className}`} {...props}/> }
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input className="input" {...props}/> }
export function Card({ children, className='' }: PropsWithChildren<{className?:string}>) { return <section className={`card ${className}`}>{children}</section> }
export function Badge({ children, tone='neutral' }: PropsWithChildren<{tone?:'neutral'|'success'|'warning'|'danger'|'purple'}>) { return <span className={`badge badge-${tone}`}>{children}</span> }
export function StatCard({ label, value, icon, detail }: {label:string;value:ReactNode;icon?:ReactNode;detail?:ReactNode}) { return <Card className="stat-card"><div className="stat-icon">{icon}</div><div><p className="muted">{label}</p><strong className="stat-value">{value}</strong>{detail&&<div className="stat-detail">{detail}</div>}</div></Card> }
