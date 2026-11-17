import React from 'react';
import { MobileGuidePreview } from './MobileGuidePreview';
import { OperationalStatus } from './ui/OperationalStatus';
import { Camera, ClipboardCheck, Users, Wrench } from 'lucide-react';

/** Public-only illustrative fixture. Never injected into customer workspaces. */
export function GuestProductPreview() {
  return <div className="min-w-0 rounded-3xl bg-brand-cloud border border-brand-mist p-4 sm:p-6">
    <div className="flex items-center justify-between gap-3 mb-4 text-xs text-slate-600"><span className="font-semibold text-slate-800">The guest experience</span><span className="rounded-full bg-white border border-slate-200 px-2.5 py-1">Interactive sample</span></div>
    <MobileGuidePreview compact property={{ name:'The Barton Creek Modern',country:'US',city:'Austin',state:'Texas',bedrooms:3,bathrooms:2.5,cover_image:'/images/barton-creek.jpg' }} guidebook={{brand_name:'The Barton Creek Modern',cover_image:'/images/barton-creek.jpg',accent_color:'#087F78',typography_style:'Modern Sans'}} sections={[
      {section_key:'welcome',title:'Welcome home',is_visible:true,content:{welcomeMessage:'Make yourself at home in Austin. Your arrival notes, house essentials and local favorites are all here.',hostName:'Sample host',hostPhone:'Demo content — not a real stay'}},
      {section_key:'checkin',title:'Arrival details',is_visible:true,content:{checkInTime:'4:00 PM',parkingInstructions:'Sample directions: park in the driveway. Access details require stay verification in the live guest portal.'}},
      {section_key:'rules',title:'House guidelines',is_visible:true,content:{quietHours:'10 PM–8 AM',smokingPolicy:'No smoking indoors',petPolicy:'Contact your host',partyPolicy:'No parties'}},
    ]} />
    <p className="text-xs text-slate-600 mt-4 text-center">Actual guidebook preview component · illustrative content</p>
  </div>;
}

export function OperationsProductPreview() {
  return <div className="rounded-2xl border border-brand-mist bg-brand-cloud p-4 sm:p-6 shadow-sm min-w-0">
    <div className="flex flex-wrap justify-between gap-3 border-b border-slate-200 pb-4 mb-5"><div><p className="text-xs font-semibold text-teal-800 uppercase tracking-widest">Operations workspace</p><h3 className="text-lg font-semibold mt-1">Know what needs attention.</h3></div><span className="text-xs text-slate-600">Illustrative workflow · not live activity</span></div>
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap gap-3 justify-between mb-5"><div><h4 className="font-semibold">Sample property</h4><p className="text-xs text-slate-600 mt-1">Turnover review</p></div><OperationalStatus reason="No live operational evaluation is connected to this illustration." /></div>
      <ul className="divide-y divide-slate-100">{[
        {icon:Users,title:'Team assignments',detail:'Review the assigned cleaner and property scope.'},
        {icon:Camera,title:'Cleaning & photo evidence',detail:'Open submitted work and supporting images.'},
        {icon:ClipboardCheck,title:'Inspection review',detail:'Review recorded results before making a decision.'},
        {icon:Wrench,title:'Open incidents',detail:'Keep unresolved issues visible to the team.'},
      ].map(({icon:Icon,title,detail})=><li key={title} className="py-4 flex gap-3"><span className="p-2 h-fit rounded-lg bg-teal-50 text-teal-800"><Icon className="w-4 h-4" aria-hidden="true" /></span><div className="min-w-0"><p className="text-sm font-semibold">{title}</p><p className="text-xs text-slate-600 mt-1">{detail}</p></div></li>)}</ul>
    </div>
    <p className="text-xs leading-relaxed text-slate-600 mt-4">Status labels describe recorded work; they are not a safety certification. Final readiness validation remains under development.</p>
  </div>;
}
