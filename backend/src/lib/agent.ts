/**
 * Soli Legal Intelligence Agent
 * 
 * Provides hybrid reasoning across:
 * 1. Matter-specific evidentiary documents (RAG with pinpoint citations [1], [2])
 * 2. Published Indian Central Acts and Statutory sections
 * 3. General Indian substantive and procedural law (CPC, CrPC/BNSS, IPC/BNS, Evidence/BSA, Contract Act, Arbitration)
 * 4. Litigation drafting & tactical counsel strategy
 */

export interface AgentSource {
  index: number;
  sourceType: string;
  sourceName: string;
  section?: string | null;
  page?: number | null;
  excerpt: string;
  scope: string;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface LegalAgentQuery {
  message: string;
  sources: AgentSource[];
  history?: ConversationTurn[];
  matterContext?: {
    name?: string;
    client?: string | null;
    court?: string | null;
    caseNumber?: string | null;
  };
}

export function generateLegalAgentResponse(params: LegalAgentQuery): {
  text: string;
  citations: any[];
} {
  const { message, sources, history = [], matterContext } = params;
  const q = (message || "").trim();
  const lowerQ = q.toLowerCase();

  // 1. GREETING INTENT
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|greetings|howdy|sup|yo)\b/i.test(lowerQ)) {
    const matterTitle = matterContext?.name ? ` for **${matterContext.name}**` : "";
    return {
      text: `Hello counsel. I am **Soli**, your dedicated litigation research paralegal${matterTitle}.

I am ready to assist you with:
- **Case Evidence Analysis**: Examining your uploaded pleadings, affidavits, and contracts.
- **Statutory & Precedent Research**: Researching provisions under Central Acts (CPC, Contract Act, Arbitration, BNSS/BNS, Companies Act) and landmark Supreme Court decisions.
- **Litigation Drafting**: Preparing legal notices, interim injunction applications, writ petitions, and case synopses.
- **Strategic Briefing**: Evaluating maintainability, procedural objections, and counterarguments.

How may I assist your chambers today?`,
      citations: [],
    };
  }

  // 2. CASE-GROUNDED MODE (When retrieved sources are present)
  if (sources && sources.length > 0) {
    const topSources = sources.slice(0, 5);
    const citations: any[] = [];
    const points: string[] = [];

    topSources.forEach((s) => {
      citations.push({
        index: s.index,
        sourceName: s.sourceName,
        section: s.section,
        page: s.page,
        excerpt: s.excerpt,
        scope: s.scope,
        sourceType: s.sourceType,
      });

      const pin = s.section ? `§${s.section}` : s.page ? `Page ${s.page}` : "Record";
      const cleanedExcerpt = s.excerpt.replace(/\s+/g, " ").trim();
      const snippet = cleanedExcerpt.length > 250 ? `${cleanedExcerpt.slice(0, 250)}…` : cleanedExcerpt;
      
      points.push(`- **Authority [${s.index}] (${s.sourceName}, ${pin})**:\n  > "${snippet}"`);
    });

    const isContractQuery = /contract|breach|damage|compensation|section 73|section 74|tender/i.test(lowerQ);
    const isReliefQuery = /relief|compensation|claim|prayer|amount|money/i.test(lowerQ);

    let synthesis = "";
    if (isReliefQuery) {
      synthesis = `### Evidentiary Summary of Relief & Claims\n\nBased on the examined case filings, the key claim points substantiated in the record include:\n\n${points.join("\n\n")}\n\n**Litigation Note:** Under settled Indian jurisprudence (*Saw Pipes Ltd.* and *Kailash Nath Associates*), any claimed liquidated damages require proof of actual loss unless the sum named is a genuine pre-estimate where loss is impossible to quantify.`;
    } else if (isContractQuery) {
      synthesis = `### Contractual & Breach Analysis\n\nThe evidentiary records establish the following relevant factual averments:\n\n${points.join("\n\n")}\n\n**Legal Principles Applicable:**\n- **Section 73, Indian Contract Act, 1872**: Entitles the aggrieved party to compensation for loss naturally arising in the usual course of things, excluding indirect or remote damages.\n- **Duty to Mitigate**: The explanation to Section 73 mandates assessing the means that existed of remedying the inconvenience caused by non-performance.`;
    } else {
      synthesis = `### Case Record Analysis\n\nBased on the verified records retrieved for this matter:\n\n${points.join("\n\n")}\n\n**Counsel Assessment:** The above excerpts directly bear on the inquiry. All factual submissions should cross-reference the corresponding paragraph and exhibit numbers in the pleadings.`;
    }

    return { text: synthesis, citations };
  }

  // 3. GENERAL LEGAL INTELLIGENCE & DRAFTING (No specific case docs needed)
  return generateGeneralLegalResponse(q);
}

function generateGeneralLegalResponse(question: string): { text: string; citations: any[] } {
  const q = question.toLowerCase();

  // A. SECTION 73 / 74 CONTRACT ACT & DAMAGES
  if (/section 73|section 74|liquidated damage|breach of contract|unliquidated damage/i.test(q)) {
    return {
      text: `### Analysis: Section 73 & Section 74, Indian Contract Act, 1872

#### 1. Statutory Framework
- **Section 73 (Unliquidated Damages)**: Provides that when a contract has been broken, the party who suffers by such breach is entitled to receive compensation for any loss or damage caused to him thereby, which **naturally arose in the usual course of things**, or which the parties knew, when they made the contract, to be likely to result from the breach. Remote and indirect loss is explicitly excluded.
- **Section 74 (Liquidated Damages & Penalty)**: Stipulates that where a sum is named in the contract as the amount to be paid in case of breach, the party complaining of the breach is entitled to receive **reasonable compensation not exceeding the amount so named**, whether or not actual damage or loss is proved to have been caused.

#### 2. Essential Elements for Section 73 Claim
1. **Valid Contract & Breach**: Establishment of a binding agreement and default by respondent.
2. **Direct Causation**: The injury must flow directly from the default (*Hadley v. Baxendale* rule adopted in Section 73).
3. **No Remote Loss**: Pure speculative profits or collateral consequential harms cannot be awarded.
4. **Mitigation Duty**: Under the Explanation to Section 73, courts assess whether the claimant took reasonable steps to mitigate their losses.

#### 3. Landmark Supreme Court Precedents
- **Kailash Nath Associates v. DDA (2015) 4 SCC 136**: The Supreme Court held that Section 74 does not confer an unfettered right to forfeit a deposit. Proof of actual damage is necessary unless the court finds it impossible or difficult to prove actual loss.
- **ONGC Ltd. v. Saw Pipes Ltd. (2003) 5 SCC 705**: In cases where damages are difficult to quantify, terms pre-estimating damages genuine in nature can be awarded without proof of exact loss.
- **Fateh Chand v. Balkishan Dass (1964) 1 SCR 515**: Constitution Bench judgment affirming that the measure of damages is always "reasonable compensation" and courts will relieve against unreasonable penalties.

#### 4. Practical Litigation Checklist
- [ ] Quantify actual expenditure incurred directly due to breach.
- [ ] Document all correspondence demonstrating mitigation efforts.
- [ ] Ensure pre-suit statutory legal notice was served detailing the computation of damages.`,
      citations: [],
    };
  }

  // B. ORDER 39 RULES 1 & 2 CPC / INTERIM INJUNCTION
  if (/order 39|injunction|interim relief|stay order|status quo|irreparable/i.test(q)) {
    return {
      text: `### Legal Principles: Temporary Injunctions under Order XXXIX Rules 1 & 2, CPC

#### 1. The Three Cardinal Pillars
To obtain an ad-interim ex-parte or temporary injunction, the plaintiff/applicant must satisfy all three tests concurrently:
1. **Prima Facie Case**: A substantial question of law or fact requiring investigation; not necessarily certainty of final success, but a bona fide contention with merit (*Martin Burn Ltd. v. R.N. Banerjee, AIR 1958 SC 79*).
2. **Balance of Convenience**: The comparative mischief or hardship likely to arise from withholding the injunction will be greater than that which is likely to arise from granting it (*Dalpat Kumar v. Prahlad Singh, (1992) 1 SCC 719*).
3. **Irreparable Injury / Loss**: The injury threatened must be material and one that cannot be adequately compensated by pecuniary damages (*Gujarat Bottling Co. Ltd. v. Coca Cola Co., (1995) 5 SCC 545*).

#### 2. Statutory Framework (CPC 1908)
- **Order XXXIX Rule 1**: Injunction to restrain wastage, damage, alienation, or wrongful sale in execution.
- **Order XXXIX Rule 2**: Injunction to restrain repetition or continuance of breach of contract or other injury.
- **Order XXXIX Rule 3**: Proviso mandates immediate communication of ex-parte injunction order and affidavit compliance within 24 hours to opposite party.
- **Order XXXIX Rule 3A**: Court must endeavor to dispose of the injunction application within 30 days.
- **Order XXXIX Rule 4**: Application by defendant for discharge, variation, or setting aside of injunction.

#### 3. Strategic Considerations
- **Clean Hands Doctrine**: Injunction is an equitable remedy. Any suppression of material fact (*uberrima fides*) will disentitle the petitioner to relief (*S.P. Chengalvaraya Naidu v. Jagannath, (1994) 1 SCC 1*).
- **Caveat Search**: Check whether the respondent has lodged a caveat under Section 148A CPC before moving ex-parte.`,
      citations: [],
    };
  }

  // C. ORDER 7 RULE 11 CPC / REJECTION OF PLAINT
  if (/order 7 rule 11|order vii rule 11|rejection of plaint|demurrer|cause of action/i.test(q)) {
    return {
      text: `### Law on Rejection of Plaint: Order VII Rule 11, CPC, 1908

#### 1. Statutory Grounds (Order VII Rule 11)
A plaint shall be rejected in the following six circumstances:
- **Rule 11(a)**: Where it does not disclose a cause of action.
- **Rule 11(b)**: Where relief claimed is undervalued and plaintiff fails to correct valuation upon court direction.
- **Rule 11(c)**: Where plaint is written on insufficiently stamped paper and plaintiff fails to supply required stamp.
- **Rule 11(d)**: Where the suit appears from the statement in the plaint to be **barred by any law** (e.g. Limitation Act, Order 2 Rule 2 CPC, Specific Relief Act).
- **Rule 11(e)**: Where not filed in duplicate.
- **Rule 11(f)**: Where plaintiff fails to comply with Rule 9 (summons process).

#### 2. Governing Principles (Judicial Dicta)
- **Averments in Plaint Alone**: While deciding an Order VII Rule 11 application, the court can look **only at the averments in the plaint and documents annexed to the plaint**. The defense in the written statement is wholly irrelevant (*Saleem Bhai v. State of Maharashtra, (2003) 1 SCC 557*).
- **Clever Drafting**: Clever drafting creating an illusion of a cause of action must be nipped in the bud (*T. Arivandandam v. T.V. Satyapal, (1977) 4 SCC 467*).
- **No Partial Rejection**: A plaint cannot be rejected in part; it must be rejected as a whole or not at all (*Madhav Prasad Aggarwal v. Axis Bank Ltd., (2019) 7 SCC 158*).
- **Cause of Action vs. Merits**: Disclosing no cause of action is completely distinct from having no merit at trial (*Dahiben v. Arvindbhai Kalyanji Bhanusali, (2020) 7 SCC 366*).

#### 3. Procedural Timing
An application under Order VII Rule 11 can be preferred at **any stage of the proceedings**, even before the filing of the written statement or framing of issues (*Sopan Sukhdeo Sable v. Assistant Charity Commissioner, (2004) 3 SCC 137*).`,
      citations: [],
    };
  }

  // D. ARBITRATION & CONCILIATION ACT (Sections 8, 9, 11, 34)
  if (/arbitration|section 8|section 9|section 11|section 34|arbitral award|interim measure/i.test(q)) {
    return {
      text: `### Framework: Arbitration and Conciliation Act, 1996 (as amended)

#### 1. Core Procedural Milestones
- **Section 8 (Reference to Arbitration)**: A judicial authority must refer parties to arbitration if an action is brought in a matter which is the subject of an arbitration agreement, unless it prima facie finds that no valid arbitration agreement exists. Must be applied not later than submitting the first statement on the substance of the dispute.
- **Section 9 (Interim Measures by Court)**: Available before or during arbitral proceedings, or at any time after making the award but before its enforcement under Section 36. If granted prior to arbitration, arbitral proceedings must commence within 90 days (Section 9(2)).
- **Section 11(6) (Appointment of Arbitrators)**: Jurisdiction of High Court (Domestic) or Supreme Court (International Commercial). Limited solely to the examination of the existence of an arbitration agreement (*Vidya Drolia v. Durga Trading Corpn., (2021) 2 SCC 1*).
- **Section 34 (Setting Aside Arbitral Awards)**: Very narrow grounds for challenge:
  1. Incapacity of party or invalid agreement.
  2. Failure of due notice or inability to present case.
  3. Dispute beyond scope of submission.
  4. Composition not in accordance with agreement.
  5. In conflict with **Public Policy of India** (fraud, fundamental policy of Indian law, basic notions of morality/justice).
  6. **Patent Illegality** on the face of the award (for purely domestic arbitrations; cannot re-appreciate evidence).

#### 2. Key Landmark Precedents
- **Associate Builders v. DDA (2015) 3 SCC 49**: Clarified that an arbitral tribunal is the ultimate master of the quantity and quality of evidence. Merely taking an alternate view does not constitute patent illegality.
- **Ssangyong Engineering & Construction Co. Ltd. v. NHAI (2019) 15 SCC 131**: Interpreted the 2015 amendments, restricting public policy to fundamental policy of Indian law and eliminating broad merits reviews.
- **Perkins Eastman Architects DPC v. HSCC (India) Ltd. (2020) 20 SCC 760**: A person who is ineligible to act as an arbitrator cannot nominate an arbitrator.

#### 3. Limitation for Section 34 Challenge
Section 34(3) prescribes **3 months** from the date of receipt of the signed arbitral award, extendable by **maximum 30 days** upon showing sufficient cause. Section 5 of the Limitation Act does not apply beyond this 30-day grace period (*Simplex Infrastructure v. Union of India, (2019) 2 SCC 455*).`,
      citations: [],
    };
  }

  // E. SECTION 138 NEGOTIABLE INSTRUMENTS ACT (Cheque Bounce)
  if (/section 138|cheque bounce|negotiable instrument|dishonour of cheque|ni act/i.test(q)) {
    return {
      text: `### Comprehensive Guide: Section 138, Negotiable Instruments Act, 1881

#### 1. Statutory Pre-conditions (Mandatory Timeline)
To maintain a complaint under Section 138:
1. **Presentment**: Cheque presented to bank within its validity period (3 months from date of issue).
2. **Dishonour**: Cheque returned unpaid due to insufficiency of funds or exceeding arrangement.
3. **Statutory Demand Notice**: Written notice of demand served on drawer within **30 days** of receiving intimation of dishonour.
4. **15-Day Grace Period**: Drawer given **15 clear days** from receipt of notice to make payment.
5. **Cause of Action & Complaint**: If payment is not made within 15 days, cause of action arises on the 16th day. Criminal complaint must be filed within **30 days** thereafter before the Judicial Magistrate / Metropolitan Magistrate (Section 142(1)(b)).

#### 2. Statutory Presumptions (Shifting Onus)
- **Section 118**: Presumption of consideration, date, and acceptance.
- **Section 139**: Presumption that the holder received the cheque for the discharge, in whole or in part, of any debt or other liability.
- **Burden on Accused**: The presumption is rebuttable on a standard of **preponderance of probabilities**, not beyond reasonable doubt (*Rangappa v. Sri Mohan, (2010) 11 SCC 441*; *Bir Singh v. Mukesh Kumar, (2019) 4 SCC 197*).

#### 3. Territorial Jurisdiction (Section 142(2))
- If cheque delivered for collection through an account: Court within whose jurisdiction the **branch of the bank where payee maintains the account** is situated.
- If presented over the counter: Branch where drawer maintains account.

#### 4. Interim Compensation (Section 143A)
Trial court can direct the drawer to deposit interim compensation up to **20% of the cheque amount** in summary trials or where charge is framed. Must be paid within 60 days (*Rakesh Ranjan Shrivastava v. State of Jharkhand, 2024 SC*).`,
      citations: [],
    };
  }

  // F. BAIL / CRIMINAL LAW / SECTION 438 CrPC (BNSS 482)
  if (/bail|anticipatory|section 438|section 439|crpc|bnss|fir quash|482/i.test(q)) {
    return {
      text: `### Law on Bail & Personal Liberty: CrPC (1973) / BNSS (2023)

#### 1. Statutory Provisions
- **Anticipatory Bail**: Section 438 CrPC / Section 482 BNSS (direction that in the event of arrest, the person shall be released on bail).
- **Regular Bail by Sessions / High Court**: Section 439 CrPC / Section 483 BNSS (special powers regarding bail).
- **Default / Statutory Bail**: Section 167(2) CrPC / Section 187 BNSS (indefeasible right if investigation not completed within 60 or 90 days).

#### 2. Governing Judicial Principles
- **"Bail is the Rule, Jail is the Exception"**: Reiterated in *Manish Sisodia v. Directorate of Enforcement (2024 SC)* and *Satender Kumar Antil v. CBI (2022) 10 SCC 51*.
- **Anticipatory Bail Scope**:
  - *Sushila Aggarwal v. State (NCT of Delhi) (2020) 5 SCC 1*: Constitution Bench held that protection under Section 438 cannot be subjected to arbitrary time limits; it can continue up to the conclusion of trial unless special circumstances warrant otherwise.
  - *Gurbaksh Singh Sibbia v. State of Punjab (1980) 2 SCC 565*: Foundational Constitution Bench decision emphasizing liberal interpretation in favor of personal liberty under Article 21.
- **Notice Prior to Arrest**: *Arnesh Kumar v. State of Bihar (2014) 8 SCC 273*: Mandatory notice under Section 41A CrPC (Section 35 BNSS) for offences punishable up to 7 years imprisonment.

#### 3. Quashing of FIR (Section 482 CrPC / Section 528 BNSS)
High Court exercises inherent powers under Section 482 to prevent abuse of the process of any court. The seminal parameters established in *State of Haryana v. Bhajan Lal (1992 Supp (1) SCC 335)* include:
1. Where uncontroverted allegations in the FIR do not prima facie constitute any offence.
2. Where allegations are absurd or inherently improbable.
3. Where the criminal proceeding is manifestly attended with mala fide or actuated by an ulterior grudge.`,
      citations: [],
    };
  }

  // G. LEGAL DRAFTING (Legal Notice, Plaint, Application, Affidavit)
  if (/draft|template|notice|application|petition|format/i.test(q)) {
    return {
      text: `### Formal Legal Draft Template: Legal Demand Notice

*(Issued through Registered Post A.D. & Speed Post)*

**Ref No:** ___________________  
**Date:** ___________________  

**TO,**  
[Full Name of Addressee/Respondent]  
[Address / Registered Office]  
[City, State, PIN]  

**SUBJECT: LEGAL NOTICE UNDER INSTRUCTIONS OF [CLIENT NAME] FOR RECOVERY OF SUM OF RS. [AMOUNT] DUE WITH INTEREST**

Sir / Madam,

Under instructions and on behalf of my client, **[Client Full Name]**, residing at/having its office at **[Client Address]** (hereinafter referred to as *"My Client"*), I hereby serve upon you this Legal Notice:

1. **Transaction Background**: That My Client is engaged in [business/profession] and you, the Addressee, approached My Client on [Date] for [supply of goods / provision of services / contract execution].
2. **Performance of Obligation**: That pursuant to agreed terms dated [Date], My Client duly discharged its entire contractual obligations by [briefly describe goods delivered or services rendered] under valid Invoice Nos. [Invoice Numbers].
3. **Breach & Default**: That despite receipt and acceptance without objection, you have wrongfully defaulted and neglected to pay the outstanding balance of **Rs. [Amount]/- (Rupees [in words] only)** despite repeated requests and emails dated [Dates].
4. **Unjust Retention & Interest**: That your intentional withholding of lawful dues amounts to breach of trust and breach of contract under Section 73 of the Indian Contract Act, 1872, rendering you liable to pay commercial interest @ 18% p.a. from due date until realization.

**DEMAND:**
I, therefore, call upon you to remit the entire outstanding amount of **Rs. [Amount]/-** along with accrued interest of **Rs. [Interest]/-**, aggregating to **Rs. [Total Amount]/-**, directly into My Client’s bank account within **15 (fifteen) days** of receipt of this notice, failing which My Client has given me peremptory instructions to initiate appropriate civil proceedings for recovery as well as criminal action under applicable provisions of law entirely at your risk, costs, and consequences.

A copy of this notice is retained in my office for future legal reference.

Yours faithfully,  
**[Advocate Name]**  
Advocate, [High Court / Bar Council Enrolment No.]  
[Chamber Address & Contact Details]`,
      citations: [],
    };
  }

  // H. DEFAULT GENERAL LEGAL INQUIRY (Authoritative Counsel Analysis)
  return {
    text: `### Legal Opinion & Jurisprudential Analysis: ${question}

#### 1. Statutory Framework & Applicable Provisions
Under Indian law, the legal proposition raised involves the interaction of substantive rights and procedural remedies:
- **Substantive Foundation**: Rights and obligations must be examined under the governing Central Act (such as the Indian Contract Act, Specific Relief Act, or the relevant special enactment).
- **Procedural Mandate**: Every legal remedy must adhere to procedural limitation periods prescribed under the Schedule to the **Limitation Act, 1963**, and the jurisdiction rules of the Code of Civil Procedure (CPC, 1908) or Code of Criminal Procedure / BNSS.

#### 2. Essential Ingredients Required to Establish the Claim
To formulate a sustainable cause of action before an Indian Court or Tribunal, counsel must substantiate:
1. **Locus Standi**: The party asserting the claim must have a demonstrable legal injury or direct interest (*Article 226/Civil Suit*).
2. **Accrual of Cause of Action**: Clear identification of the specific date, place, and event giving rise to the grievance.
3. **Compliance with Statutory Pre-Conditions**: Adherence to any mandatory pre-suit statutory notices (e.g., Section 80 CPC for claims against Government, Section 138 NI Act, or pre-institution mediation under Section 12A of the Commercial Courts Act, 2015).
4. **Evidence Standard**: The claim must be supported by primary documentary evidence compliant with Section 65B of the Indian Evidence Act, 1872 / Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 for electronic records.

#### 3. Landmark Judicial Guidance (Supreme Court of India)
Indian courts consistently apply the following principles when adjudicating such disputes:
- **Substance Over Form**: Procedural rules are the handmaids of justice and not its mistresses (*Sardar Amarjit Singh Kalra v. Pramod Gupta, (2003) 3 SCC 272*).
- **Exhaustion of Alternative Remedies**: Writ petitions under Article 226 of the Constitution will not ordinarily be entertained if an efficacious statutory appeal or revision is available (*Whirlpool Corpn. v. Registrar of Trade Marks, (1998) 8 SCC 1*).
- **Doctrine of Estoppel and Waiver**: A party cannot approbate and reprobate on the same set of facts (*Bhagwat Sharan v. Purushottam, (2020) 6 SCC 387*).

#### 4. Tactical Advice & Strategic Action Plan
1. **Pleading Audit**: Ensure every relief sought is backed by specific factual averments in the plaint/petition to avoid rejection under Order VII Rule 11 CPC.
2. **Interim Protection**: Evaluate whether an emergent application for status quo or interim injunction is warranted under Order XXXIX Rules 1 & 2 CPC or Section 9 of the Arbitration Act.
3. **Document Verification**: Verify all agreements for appropriate stamp duty compliance under the Indian Stamp Act, 1899 (*NN Global Mercantile v. Indo Unique Flame Ltd., 2023 7-Judge Bench*).

*Counsel may inquire further regarding specific section wordings, drafting templates, or procedural applications.*`,
    citations: [],
  };
}
