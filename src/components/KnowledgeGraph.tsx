// KnowledgeGraph

import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Trial } from '../lib/trials'

type NodeType = 'trial' | 'institution' | 'researcher' | 'intervention'
type LinkType =
  | 'conducts'                
  | 'studies'                 
  | 'investigates'          
  | 'shares-institution'    
  | 'shares-intervention'   
  | 'shares-both'           

interface Node {
  id: string
  type: NodeType
  name: string
  data?: any
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface LinkMetaReason {
  kind: 'institution' | 'intervention'
  value: string
}

interface Link {
  source: string | Node
  target: string | Node
  type: LinkType
  strength?: number
  meta?: { reasons?: LinkMetaReason[] }
}

interface KnowledgeGraphProps {
  trials: Trial[]
  width?: number
  height?: number
  condition?: string
  onNodeClick?: (node: Node) => void
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  trials,
  width = 900,
  height = 600,
  condition,
  onNodeClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [selectedLink, setSelectedLink] = useState<Link | null>(null)
  const [stats, setStats] = useState({
    trials: 0,
    institutions: 0,
    researchers: 0,
    connections: 0,
  })

  useEffect(() => {
    if (!svgRef.current || !trials?.length) return
    const root = d3.select(svgRef.current)
    root.selectAll('*').remove()

    const { nodes, links } = generateGraphData(trials, {
      pairTrialsBySharedInstitution: true,
      pairTrialsBySharedIntervention: true,
    })

    setStats({
      trials: nodes.filter(n => n.type === 'trial').length,
      institutions: nodes.filter(n => n.type === 'institution').length,
      researchers: nodes.filter(n => n.type === 'researcher').length,
      connections: links.length,
    })

    const svg = root.attr('width', width).attr('height', height).attr('viewBox', [0, 0, width, height] as any)
    const g = svg.append('g')
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]).on('zoom', (e) => g.attr('transform', e.transform as any))
    svg.call(zoom as any)

    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(linkDistance).strength(d => d.strength ?? 0.65))
      .force('charge', d3.forceManyBody().strength(-450))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(28))

    const defs = svg.append('defs')
    const linkGradients = defs
      .selectAll('linearGradient')
      .data(links)
      .enter()
      .append('linearGradient')
      .attr('id', (_: any, i: number) => `link-gradient-${i}`)
      .attr('gradientUnits', 'userSpaceOnUse')

    linkGradients.append('stop').attr('offset', '0%').attr('stop-color', (d: any) => getLinkColor(d.type)).attr('stop-opacity', 0.9)
    linkGradients.append('stop').attr('offset', '100%').attr('stop-color', (d: any) => getLinkColor(d.type)).attr('stop-opacity', 0.2)

    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (_: any, i: number) => `url(#link-gradient-${i})`)
      .attr('stroke-width', (d) => Math.max(1, (d.strength ?? 0.5) * 4))
      .attr('stroke-opacity', 0.75)
      .on('mouseenter', function (_, _d) {
        setSelectedLinkPreviewStyles(this as SVGLineElement, true)
      })
      .on('mouseleave', function () {
        setSelectedLinkPreviewStyles(this as SVGLineElement, false)
      })
      .on('click', function (event, d) {
        event.stopPropagation()
        setSelectedLink(d)
        setSelectedNode(null)
      })

    link.append('title').text((d) => linkTooltip(d))

    const nodeGroup = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended) as any
      )

    const circles = nodeGroup
      .append('circle')
      .attr('r', (d) => getNodeRadius(d.type))
      .attr('fill', (d) => getNodeColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)

    nodeGroup
      .append('text')
      .text((d) => getNodeIcon(d.type))
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', (d) => getNodeRadius(d.type) * 0.8)
      .attr('fill', 'white')
      .attr('pointer-events', 'none')

    nodeGroup
      .append('text')
      .text((d) => truncateText(d.name, 22))
      .attr('dy', (d) => getNodeRadius(d.type) + 14)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('fill', '#374151')
      .attr('pointer-events', 'none')

    nodeGroup
      .on('mouseenter', function (_, d) {
        const connected = new Set<string>([d.id])
        links.forEach((lnk) => {
          const s = typeof lnk.source === 'string' ? lnk.source : lnk.source.id
          const t = typeof lnk.target === 'string' ? lnk.target : lnk.target.id
          if (s === d.id) connected.add(typeof lnk.target === 'string' ? lnk.target : lnk.target.id)
          if (t === d.id) connected.add(typeof lnk.source === 'string' ? lnk.source : lnk.source.id)
        })
        circles.attr('opacity', (n: Node) => (connected.has(n.id) ? 1 : 0.2)).attr('stroke-width', (n: Node) => (n.id === d.id ? 4 : connected.has(n.id) ? 3 : 2))
        link.attr('stroke-opacity', (ld: any) => {
          const s = typeof ld.source === 'string' ? ld.source : ld.source.id
          const t = typeof ld.target === 'string' ? ld.target : ld.target.id
          return s === d.id || t === d.id ? 1 : 0.12
        })
      })
      .on('mouseleave', function () {
        circles.attr('opacity', 1).attr('stroke-width', 2)
        link.attr('stroke-opacity', 0.75)
      })
      .on('click', function (event, d) {
        event.stopPropagation()
        setSelectedNode(d)
        setSelectedLink(null)
        onNodeClick?.(d)
      })

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => (d.source as Node).x!)
        .attr('y1', (d: any) => (d.source as Node).y!)
        .attr('x2', (d: any) => (d.target as Node).x!)
        .attr('y2', (d: any) => (d.target as Node).y!)
      linkGradients
        .attr('x1', (_: any, i: number) => (links[i].source as Node).x!)
        .attr('y1', (_: any, i: number) => (links[i].source as Node).y!)
        .attr('x2', (_: any, i: number) => (links[i].target as Node).x!)
        .attr('y2', (_: any, i: number) => (links[i].target as Node).y!)
      nodeGroup.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    svg.on('click', () => {
      setSelectedNode(null)
      setSelectedLink(null)
    })

    return () => {
      simulation.stop()
    }
  }, [trials, width, height, onNodeClick])

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
      {/* Stats strip */}
      <div className="rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Knowledge Graph</div>
          {condition ? <div className="text-sm text-gray-500">Condition: {condition}</div> : null}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard value={stats.trials} label="Trials" />
          <MetricCard value={stats.institutions} label="Institutions" tone="amber" />
          <MetricCard value={stats.researchers} label="Researchers" tone="rose" />
          <MetricCard value={stats.connections} label="Connections" tone="green" />
        </div>
        <div className="mt-4 rounded-lg border border-gray-100 overflow-hidden">
          <svg ref={svgRef} style={{ display: 'block', width: '100%', height }} />
        </div>
      </div>

      {/* Details panel shows either node or link */}
      <aside className="rounded-xl border border-gray-200 shadow-sm p-4 h-fit">
        <div className="font-semibold mb-2">Details</div>

        {selectedLink ? (
          <LinkDetails link={selectedLink} />
        ) : selectedNode ? (
          <NodeDetails node={selectedNode} />
        ) : (
          <div className="text-sm text-gray-500">Click a node or an edge to see details.</div>
        )}
      </aside>
    </div>
  )
}

export default KnowledgeGraph

function MetricCard({
  value,
  label,
  tone = 'blue',
}: {
  value: number
  label: string
  tone?: 'blue' | 'amber' | 'rose' | 'green'
}) {
  const tones: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600' },
  }
  const t = tones[tone]
  return (
    <div className={`rounded-lg ${t.bg} px-4 py-3`}>
      <div className={`text-xl font-semibold ${t.text}`}>{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  )
}

function NodeDetails({ node }: { node: Node }) {
  return (
    <div className="space-y-1 text-sm">
      <div><span className="font-medium">Name:</span> {node.name}</div>
      <div><span className="font-medium">Type:</span> {node.type}</div>
      {node.data ? (
        <pre className="bg-gray-50 rounded-lg p-2 overflow-auto text-xs">{JSON.stringify(node.data, null, 2)}</pre>
      ) : (
        <div className="text-gray-500">No extra metadata.</div>
      )}
    </div>
  )
}

function LinkDetails({ link }: { link: Link }) {
  const s = (typeof link.source === 'string' ? link.source : link.source.id).split(':').pop()
  const t = (typeof link.target === 'string' ? link.target : link.target.id).split(':').pop()
  const sName = typeof link.source === 'string' ? s : (link.source as Node).name
  const tName = typeof link.target === 'string' ? t : (link.target as Node).name
  return (
    <div className="space-y-2 text-sm">
      <div><span className="font-medium">Relationship:</span> {prettyLinkType(link.type)}</div>
      <div><span className="font-medium">Between:</span> {sName} ↔ {tName}</div>
      {link.meta?.reasons?.length ? (
        <div>
          <div className="font-medium">Reason(s):</div>
          <ul className="list-disc pl-5">
            {link.meta.reasons.map((r, i) => (
              <li key={i}>{r.kind === 'institution' ? 'Shared institution' : 'Shared intervention'}: <span className="font-mono">{r.value}</span></li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function getNodeRadius(type: NodeType): number {
  switch (type) {
    case 'trial': return 18
    case 'institution': return 14
    case 'researcher': return 12
    case 'intervention': return 11
    default: return 12
  }
}
function getNodeColor(type: NodeType): string {
  switch (type) {
    case 'trial': return '#2563EB'         
    case 'institution': return '#059669'   
    case 'researcher': return '#7C3AED'    
    case 'intervention': return '#EA580C'  
    default: return '#6B7280'
  }
}
function getLinkColor(type: LinkType): string {
  switch (type) {
    case 'conducts': return '#10B981'            
    case 'studies': return '#3B82F6'             
    case 'investigates': return '#F59E0B'        
    case 'shares-institution': return '#8B5CF6'  
    case 'shares-intervention': return '#EC4899' 
    case 'shares-both': return '#06B6D4'         
    default: return '#9CA3AF'
  }
}
function linkDistance(d: Link): number {
  switch (d.type) {
    case 'conducts': return 90
    case 'studies': return 90
    case 'investigates': return 110
    case 'shares-institution': return 80
    case 'shares-intervention': return 80
    case 'shares-both': return 75
    default: return 90
  }
}
function getNodeIcon(type: NodeType): string {
  switch (type) {
    case 'trial': return '🧪'
    case 'institution': return '🏥'
    case 'researcher': return '👩‍🔬'
    case 'intervention': return '💊'
    default: return '•'
  }
}
function truncateText(s: string, max = 22): string {
  if (!s) return ''
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}
function prettyLinkType(t: LinkType): string {
  switch (t) {
    case 'conducts': return 'Trial conducted at Institution'
    case 'studies': return 'Trial studies Intervention'
    case 'investigates': return 'Researcher investigates Trial'
    case 'shares-institution': return 'Trials share Institution'
    case 'shares-intervention': return 'Trials share Intervention'
    case 'shares-both': return 'Trials share Institution & Intervention'
    default: return t
  }
}
function setSelectedLinkPreviewStyles(el: SVGLineElement, hover: boolean) {
  d3.select(el)
    .attr('stroke-opacity', hover ? 1 : 0.75)
    .attr('stroke-width', function () {
      const w = Number(d3.select(this).attr('stroke-width') || 2)
      return hover ? Math.max(2, w + 1) : Math.max(1, w - 1)
    })
}


function generateGraphData(
  trials: Trial[],
  opts: { pairTrialsBySharedInstitution?: boolean; pairTrialsBySharedIntervention?: boolean } = {},
): { nodes: Node[]; links: Link[] } {
  const nodesMap = new Map<string, Node>()
  const links: Link[] = []

  const addNode = (id: string, type: NodeType, name: string, data?: any): Node => {
    if (!nodesMap.has(id)) nodesMap.set(id, { id, type, name: name || id, data })
    return nodesMap.get(id)!
  }

  const pairReasons = new Map<
    string,
    { a: string; b: string; institutions: Set<string>; interventions: Set<string> }
  >()
  const addPairReason = (a: string, b: string, kind: 'institution' | 'intervention', value: string) => {
    const [x, y] = a < b ? [a, b] : [b, a]
    const key = `${x}|${y}`
    let entry = pairReasons.get(key)
    if (!entry) {
      entry = { a: x, b: y, institutions: new Set(), interventions: new Set() }
      pairReasons.set(key, entry)
    }
    if (kind === 'institution') entry.institutions.add(value)
    else entry.interventions.add(value)
  }

  const instToTrials = new Map<string, Set<string>>()
  const ivToTrials = new Map<string, Set<string>>()

  const getTrialId = (t: any, i: number) => String(t?.nctId || t?.id || `trial-${i}`)
  const getTrialTitle = (t: any, i: number) =>
    t?.briefTitle || t?.title || t?.officialTitle || t?.conditionSummary || `Trial ${i + 1}`

  trials.forEach((raw, i) => {
    const t: any = raw as any
    const trialId = getTrialId(t, i)
    const trialNode = addNode(`trial:${trialId}`, 'trial', getTrialTitle(t, i), raw)

    const locs = Array.isArray(t?.locations) ? t.locations : []
    const seenInst = new Set<string>()
    for (const loc of locs) {
      const name =
        typeof loc === 'string'
          ? loc
          : loc?.name || loc?.facility?.name || loc?.organization || loc?.institution || ''
      if (!name || seenInst.has(name)) continue
      seenInst.add(name)
      const instId = `inst:${name}`
      addNode(instId, 'institution', name)
      links.push({ source: trialNode.id, target: instId, type: 'conducts', strength: 0.85 })
      if (opts.pairTrialsBySharedInstitution) {
        if (!instToTrials.has(instId)) instToTrials.set(instId, new Set())
        instToTrials.get(instId)!.add(trialNode.id)
      }
    }

    const interventionNames: string[] =
      t?.interventionNames ||
      (Array.isArray(t?.interventions) ? t.interventions.map((iv: any) => iv?.name).filter(Boolean) : []) ||
      []
    const seenIv = new Set<string>()
    for (const iv of interventionNames) {
      if (!iv || seenIv.has(iv)) continue
      seenIv.add(iv)
      const ivId = `iv:${iv}`
      addNode(ivId, 'intervention', iv)
      links.push({ source: trialNode.id, target: ivId, type: 'studies', strength: 0.75 })
      if (opts.pairTrialsBySharedIntervention) {
        if (!ivToTrials.has(ivId)) ivToTrials.set(ivId, new Set())
        ivToTrials.get(ivId)!.add(trialNode.id)
      }
    }

    const pi = t?.principalInvestigator || t?.overallOfficial?.[0]?.name || t?.contacts?.overallOfficial?.name || null
    if (pi) {
      const piNode = addNode(`pi:${pi}`, 'researcher', pi)
      links.push({ source: piNode.id, target: trialNode.id, type: 'investigates', strength: 0.6 })
    }
  })

  for (const [instId, trSet] of instToTrials.entries()) {
    const name = instId.slice('inst:'.length)
    const arr = Array.from(trSet)
    for (let a = 0; a < arr.length; a++) {
      for (let b = a + 1; b < arr.length; b++) {
        addPairReason(arr[a], arr[b], 'institution', name)
      }
    }
  }
  for (const [ivId, trSet] of ivToTrials.entries()) {
    const name = ivId.slice('iv:'.length)
    const arr = Array.from(trSet)
    for (let a = 0; a < arr.length; a++) {
      for (let b = a + 1; b < arr.length; b++) {
        addPairReason(arr[a], arr[b], 'intervention', name)
      }
    }
  }

  for (const { a, b, institutions, interventions } of pairReasons.values()) {
    const reasons: LinkMetaReason[] = [
      ...Array.from(institutions).map(v => ({ kind: 'institution' as const, value: v })),
      ...Array.from(interventions).map(v => ({ kind: 'intervention' as const, value: v })),
    ]
    const type: LinkType =
      institutions.size && interventions.size
        ? 'shares-both'
        : institutions.size
        ? 'shares-institution'
        : 'shares-intervention'
    const strength = 0.25 + Math.min(0.35, (reasons.length - 1) * 0.05) 
    links.push({ source: a, target: b, type, strength, meta: { reasons } })
  }

  return { nodes: Array.from(nodesMap.values()), links }
}

function dragstarted(event: any, d: Node) {
  if (!event.active) (event.subject?.simulation ?? null)?.alphaTarget?.(0.3)?.restart?.()
  d.fx = d.x
  d.fy = d.y
}
function dragged(event: any, d: Node) {
  d.fx = event.x
  d.fy = event.y
}
function dragended(event: any, d: Node) {
  if (!event.active) (event.subject?.simulation ?? null)?.alphaTarget?.(0)
  d.fx = null
  d.fy = null
}

function linkTooltip(d: Link): string {
  const s = typeof d.source === 'string' ? d.source : (d.source as Node).name
  const t = typeof d.target === 'string' ? d.target : (d.target as Node).name
  const reasons =
    d.meta?.reasons?.map(r => `${r.kind === 'institution' ? 'inst' : 'iv'}: ${r.value}`).join(', ') || ''
  return `${prettyLinkType(d.type)}\n${s} ↔ ${t}${reasons ? `\n${reasons}` : ''}`
}
