// Native modality includes dynamic links, summaries and form controls in the
// browser's focus order and prevents keyboard/pointer access to the background.
const initialized=new WeakSet<HTMLDialogElement>();
function keepReviewFocus(dialog:HTMLDialogElement):void {
 if(initialized.has(dialog))return;initialized.add(dialog);
 dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const stops=Array.from(dialog.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],summary,[tabindex]'))
   .filter(element=>element.tabIndex>=0&&element.getClientRects().length&&!element.matches(':disabled')&&!element.closest('[inert]'));
  const first=stops[0],last=stops.at(-1);if(!first||!last)return;
  // Native dialogs can move focus to browser chrome at the boundary. Keep the
  // review loop explicit, but discover ALL current controls rather than two buttons.
  const active=document.activeElement;
  if(!stops.includes(active as HTMLElement)||event.shiftKey&&active===first||!event.shiftKey&&active===last){event.preventDefault();(event.shiftKey?last:first).focus();}
 });
}
const origins=new WeakMap<HTMLDialogElement,HTMLElement>();
export function openReview(dialog:HTMLDialogElement,origin:Element|null,initial:HTMLElement):void {
 keepReviewFocus(dialog);
 if(origin instanceof HTMLElement)origins.set(dialog,origin);
 const error=dialog.querySelector<HTMLElement>('.review-error');if(error){error.hidden=true;error.textContent='';}
 dialog.hidden=false;if(!dialog.open)dialog.showModal();initial.focus();
}
export function closeReview(dialog:HTMLDialogElement,fallback:HTMLElement):void {
 if(!dialog.open){dialog.hidden=true;return;}
 const savedOrigin=origins.get(dialog);dialog.close();dialog.hidden=true;origins.delete(dialog);
 // Conversation polling may replace a review button while the dialog is open.
 const origin=savedOrigin?.id?document.getElementById(savedOrigin.id):savedOrigin;
 const target=origin?.isConnected&&origin.getClientRects().length&&getComputedStyle(origin).visibility!=='hidden'&&!origin.matches(':disabled')&&!origin.closest('[inert]')?origin:fallback;
 target.focus();
}
