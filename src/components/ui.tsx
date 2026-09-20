import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { Check, ChevronDown, X } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/utils'

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'destructive' }>(
  ({ className, variant = 'default', ...props }, ref) => <button ref={ref} className={cn('button', `button-${variant}`, className)} {...props} />)
Button.displayName = 'Button'
export function Card({ className, children, id }: { className?: string; children: ReactNode; id?: string }) { return <section id={id} className={cn('card', className)}>{children}</section> }
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => <input ref={ref} className={cn('input', className)} {...props} />)
Input.displayName = 'Input'
export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) { return <label className="label" htmlFor={htmlFor}>{children}</label> }
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'safe' | 'warning' }) { return <span className={`badge badge-${tone}`}>{children}</span> }

export function Select({ value, onValueChange, children }: { value: string; onValueChange(value: string): void; children: ReactNode }) { return <SelectPrimitive.Root value={value} onValueChange={onValueChange}>{children}</SelectPrimitive.Root> }
export function SelectTrigger({ children }: { children: ReactNode }) { return <SelectPrimitive.Trigger className="select-trigger">{children}<SelectPrimitive.Icon><ChevronDown size={15} /></SelectPrimitive.Icon></SelectPrimitive.Trigger> }
export function SelectValue() { return <SelectPrimitive.Value /> }
export function SelectContent({ children }: { children: ReactNode }) { return <SelectPrimitive.Portal><SelectPrimitive.Content className="select-content" position="popper"><SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal> }
export function SelectItem({ value, children }: { value: string; children: ReactNode }) { return <SelectPrimitive.Item value={value} className="select-item"><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText><SelectPrimitive.ItemIndicator><Check size={14} /></SelectPrimitive.ItemIndicator></SelectPrimitive.Item> }

export function Switch({ checked, onCheckedChange, label, disabled }: { checked: boolean; onCheckedChange(value: boolean): void; label: string; disabled?: boolean }) { return <SwitchPrimitive.Root checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} className="switch" aria-label={label}><SwitchPrimitive.Thumb className="switch-thumb" /></SwitchPrimitive.Root> }

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export function DialogContent({ children }: { children: ReactNode }) { return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="overlay" /><DialogPrimitive.Content className="dialog">{children}<DialogPrimitive.Close className="dialog-close" aria-label="Close"><X size={17} /></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal> }
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

export const AlertDialog = DialogPrimitive.Root
export const AlertDialogTrigger = DialogPrimitive.Trigger
export function AlertDialogContent({ children }: { children: ReactNode }) { return <DialogContent>{children}</DialogContent> }
export const AlertDialogTitle = DialogPrimitive.Title
export const AlertDialogDescription = DialogPrimitive.Description
export const AlertDialogAction = DialogPrimitive.Close
export const AlertDialogCancel = DialogPrimitive.Close
export const ToastProvider = ToastPrimitive.Provider
export const Toast = ToastPrimitive.Root
export const ToastTitle = ToastPrimitive.Title
export const ToastViewport = ToastPrimitive.Viewport
