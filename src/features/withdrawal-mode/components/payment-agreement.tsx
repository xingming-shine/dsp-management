"use client"

import { ChevronDownIcon, FileTextIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"

/** The reference prototype's agreement, shared by application and read-only detail. */
export function PaymentAgreementText() {
  return <div className="flex flex-col gap-3 text-sm">
    <h4 className="font-medium">Amendment – Payment Terms</h4>
    <p className="font-medium">PAYMENT TERMS AMENDMENT</p>
    <p>This Amendment (&quot;Amendment&quot;) is entered into as of the date of last signature below (&quot;Effective Date&quot;), by and between the parties identified in the signature block below.</p>
    <p className="font-medium">1. DEFINITIONS</p><p>&quot;Payment Terms&quot; means the payment terms and conditions for services rendered under the Master Agreement.</p>
    <p className="font-medium">2. AMENDMENT TO PAYMENT TERMS</p><p>The parties agree to amend the Payment Terms as follows: [Terms to be specified]</p>
    <p className="font-medium">3. EFFECT OF AMENDMENT</p><p>Except as specifically modified by this Amendment, all other terms and conditions of the Master Agreement shall remain in full force and effect.</p>
    <p className="font-medium">4. GOVERNING LAW</p><p>This Amendment shall be governed by and construed in accordance with the laws of the State of Delaware.</p>
  </div>
}

export function AgreementSigning() {
  return <section aria-labelledby="withdrawal-agreement-title" className="flex min-w-0 flex-col gap-4">
    <h3 id="withdrawal-agreement-title" className="text-base font-medium">协议签署</h3>
    <Collapsible defaultOpen className="min-w-0 overflow-hidden rounded-lg border">
      <CollapsibleTrigger asChild><Button variant="ghost" className="h-auto w-full justify-start gap-2 px-4 py-3" aria-label="Amendment_Payment 协议预览"><ChevronDownIcon data-icon="inline-start" className="transition-transform in-data-[state=closed]:-rotate-90" /><FileTextIcon /><span className="truncate">Amendment_Payment</span></Button></CollapsibleTrigger>
      <CollapsibleContent>
        <Separator />
        <div role="region" aria-label="付款条款补充协议正文" tabIndex={0} className="max-h-96 overflow-y-auto overscroll-contain p-5 outline-none focus-visible:ring-1 focus-visible:ring-ring/50 sm:p-6"><PaymentAgreementText /></div>
      </CollapsibleContent>
    </Collapsible>
  </section>
}
