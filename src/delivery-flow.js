/** Advance once through the ordered list, skipping already visited stops. */
export function nextPending(deliveries,currentId){
 const index=deliveries.findIndex(d=>d.id===currentId);
 const ordered=[...deliveries.slice(index+1),...deliveries.slice(0,index+1)];
 return ordered.find(d=>d.status==='pending')?.id??null;
}
