# Architekturvision: CarryOS + UGC Affiliate OS

> **Quelle:** Nutzer-providierte Projektbeschreibung
> **Eingepflegt:** 2026-09-03 in Branch `audit-consolidation`
> **Status:** Langfristige Zielarchitektur

---

## Zusammenfassung der Vision

CarryOS ist das **AI Business Operating System** – der gemeinsame Plattformkern.
UGC Affiliate OS ist ein **spezialisiertes Fachplugin** darauf.

### CarryOS stellt bereit:
- Agent Runtime, Workflow Engine, Skill Registry
- Connector/MCP Layer, Event Bus
- Tenant- und Identity-System
- AI Routing (OmniRoute Free → OpenCode Go → Zen → OmniRoute Paid)
- FinOps, Security, RLS, Audit Logs
- BYO API Key Management

### UGC Affiliate OS liefert:
- Affiliate Opportunity Scoring
- Produkt-Recherche-Workflows
- UGC Content Strategie
- Ghost-Brand-Management
- Video Pipeline (Kling, HeyGen, Higgsfield + freie Modelle)
- Social Media Publishing (TikTok, Instagram, YouTube, Facebook, Reddit)
- Multi-Brand / Multi-Account Management
- Commerce Analytics & Self-Optimization

---

## Langfristiges Zielbild

> „Ich moechte eine automatisierte Fashion Affiliate Agency aufbauen."

CarryOS fuehrt dann:
1. Business Audit
2. Workforce Generierung (Research Agent, Content Strategist, Script Writer, Video Producer, etc.)
3. Plugin-Empfehlung (UGC Affiliate / Fashion Agency)
4. Account- & API-Abfrage
5. Installation von Skills, Connectoren, Workflows

**Ergebnis:** Der Benutzer steuert das gesamte Unternehmen ueber CarryOS.

---

## Implikation fuer die Konsolidierung

Die 3 alten UGC-Repos (`one-user-ugc-affiliate-center`, `one-user-ugc-affiliate-center-main`, `ugc-affiliate-agency`) sind **fruehere Iterationen** auf dem Weg zu dieser Vision.

- Sie enthalten **keine CarryOS-Core-Integration** (keine shared Workspaces, keine Imports)
- Sie sind **eigenstaendige Next.js-Monolithen**
- `ugc-affiliate-os` ist der **Zwischenschritt** – konsolidiert die besten Konzepte
- Langfristig wird `ugc-affiliate-os` in ein **echtes CarryOS-Plugin** ueberfuehrt

**Empfehlung:** Die alten Repos koennen geloescht werden. Die relevanten Konzepte leben in `ugc-affiliate-os` weiter und werden von dort in die CarryOS-Plugin-Architektur migriert.

---

## Verbindung zu anderen Repos im Oekosystem

| Repository | Rolle | Verhaeltnis zu UGC |
|------------|-------|-------------------|
| `CarryOS` | Plattformkern | UGC ist konzeptionell ein Plugin |
| `xxx` | Meta-Doku | Beschreibt CarryOS-Oekosystem |
| `who-knows-enterprise` | Streetwear/Shop Plugin | Separates Fachplugin, nicht Affiliate |
| `teleson-team-sales-socialmedia-ads-agency` | Energy Sales Plugin | Separates Fachplugin |
| `Noir-Agency` | Agentur Plugin | Separates Fachplugin |
| `NCH-Agency-` | Agentur Plugin | Separates Fachplugin |
| `escort-agency-os` | Agentur Plugin | Separates Fachplugin |
| `SHK-Office-Edition` | SHK Plugin | Separates Fachplugin |

---

*Dieses Dokument ergaenzt den AUDIT_REPORT_2026-09-03.md*
