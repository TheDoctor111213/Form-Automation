**PARSING SOURCE LIST:**

\[All sourced values will live as an option in a dropdown for that cell so that the user can always select that value. Cells like "state" and "POC" which already have standalone dropdown menus for separate reason from multi-source feeds must maintain their functionality throughout this overhaul.]



*Section 2*

\- Name of property: name input when property was created in menu (which trumps) > Navigator > RCS

\- Address of property: Navigator > RCS

\- FHA / Section 8 # (are these different? I think section 8 number is input by HUD.): RS > Navigator > RCS

\- Name of entity: RS > Navigator

\- Entity type: RS > Navigator



*Section 3*

\- Point of contact (and by extension, email and phone if the POC is in the PM contacts list): Navigator > RCS

\- General Partner: RS

\- Name of signatory: RS

\- Signatory title: RS



*Section 5*

\- Appraisal company: RCS

\- Appraisal address: RCS

\- Appraiser name: RCS

\- Email: RCS

\- Phone: RCS



*Section 6*

\- Date rents will be effective: RS (+1 year)

\- Unit Type, Units, UA: RS > RCS

\- Current rent: RS

\- Proposed rent: RCS

\- Non-revenue producing units: RS

\- SAMFR: HUD API > \& RCS



*Section 7*

\- All of section 7 - RS



*Section 8*

\- Sender name: Navigator or Property Contacts excel (ideally these have the same data)

\------------------------------------------------------------------------------------------------------------------------------

**TO-DO:**

1. Integrate the HUD SAFMR API.
2. Integrate the AI API for section 1 file parsing.
3. Add CA, appraiser, VP of GP, and community manager stored contacts. Verify that the parsing feature will automatically fill this section in like the PM contacts feature.
4. Verify that the parsing feature will assign a PM.
5. Generate the excel file.
6. Integrate the Navigator data into the app; understand which fields should be hardwired to the Navigator data (and how that will be represented vs. basic database-level saves, if any are needed after a Navigator integration); understand the presentation to the user of selecting a Navigator pre-fill.
7. Encode a pre-generation warning page that indicates to the user any discrepancies or potentially incomplete cells/sections within the form.
8. Develop a robust warning message architecture to alert users of missing inputs or unintentional overrides when they click "save to database," "generate," and more.
9. Add a saved package section for each property, which gives users the ability to save a specific form configuration that stays even after they go back into the form and make changes.
10. Standardize RS generation for properties with excess unit types.
11. Standardize RS generation for properties with non-section 8 units.
12. Standardize the combination of excess unit types and non-section 8 units.
13. Introduce a "revert to parsed data" for all relevant sections (e.g., unit types).

\------------------------------------------------------------------------------------------------------------------------------



