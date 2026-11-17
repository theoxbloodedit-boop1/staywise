import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OperationalStatus } from '../src/components/ui/OperationalStatus.js';
import { GuestProductPreview, OperationsProductPreview } from '../src/components/ProductPreview.js';
import { PUBLIC_PAGE_PATHS, renderPublicPage } from '../src/routes.js';

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

test('operational status is presentation-only, unknown and absent statuses never become READY', () => {
  for (const status of [undefined, null, '', 'Unexpected state']) {
    const html = render(React.createElement(OperationalStatus, { status, reason: 'Recorded reason' }));
    assert.doesNotMatch(html, />READY</);
    assert.match(html, /Recorded reason/);
  }
  for (const [status,label] of [['Ready','READY'],['Blocked','BLOCKED'],['In Progress','IN PROGRESS'],['Needs Review','NEEDS REVIEW']]) {
    assert.ok(render(React.createElement(OperationalStatus,{status})).includes(label));
  }
});

test('public product preview uses real guest component, explicit sample labels and no invented approval', () => {
  const guest = render(React.createElement(GuestProductPreview));
  assert.match(guest, /Interactive sample/);
  assert.match(guest, /Actual guidebook preview component/);
  assert.match(guest, /aria-pressed="true"/);
  const operations = render(React.createElement(OperationsProductPreview));
  assert.match(operations, /not live activity/);
  assert.match(operations, /STATUS UNAVAILABLE/);
  assert.doesNotMatch(operations, /checks passed|Supervisor sign-off|>READY</);
});

test('every marketing route still renders with a skip destination and existing navigation', () => {
  for (const pathname of PUBLIC_PAGE_PATHS) {
    const element = renderPublicPage({ pathname, onNavigatePath:()=>{}, onEnterWorkspace:()=>{}, onOpenAuth:()=>{} });
    assert.ok(element);
    const html=render(element);
    assert.equal((html.match(/id="main-content"/g)||[]).length,1,pathname);
    for (const link of ['/features','/pricing','/security','/privacy','/terms']) assert.ok(html.includes(`href="${link}"`),`${pathname}: ${link}`);
    assert.doesNotMatch(html,/href="#"/);
  }
});

test('homepage keeps sample portal links, plan capacities and accessible FAQ associations', () => {
  const element=renderPublicPage({pathname:'/',onNavigatePath:()=>{},onEnterWorkspace:()=>{},onOpenAuth:()=>{}})!;
  const html=render(element);
  for(const slug of ['barton-creek-modern','vista-chino-villa','newport-harbor-cottage']) assert.ok(html.includes(`/guest/${slug}?code=`));
  assert.match(html,/aria-controls="faq-answer-0"/);
  assert.match(html,/id="faq-answer-0"/);
  assert.doesNotMatch(html,/Most Popular/);
  for(const capacity of [5,15,50]) assert.ok(html.includes(`Up to ${capacity} properties`));
});
