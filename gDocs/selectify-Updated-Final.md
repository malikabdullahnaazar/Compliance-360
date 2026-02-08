**Selectify Project Document**

**Updated Version - Incorporating Client Feedback**





# Executive Summary

This document presents the Selectify project flow and requirements, updated to incorporate client feedback and changes. The original project structure has been preserved, with all client comments and requirements documented in detail.


This document includes:

• Complete project flow and structure from the original document

• 44 client comments and feedback items

• Detailed requirements and specifications


# Table of Contents

(Table of contents will be automatically generated in final version)


# Project Flow and Structure

**Complete Selectify Platform Usage Examples**

**Example 1: Super Admin Creates Club Admin**

**Characters:**

**Michael Chen** - Super Admin

**Sarah Johnson** - New Club Admin (to be created)

**Thunderbirds Netball Club** - The club

**Step-by-Step Flow:**

**Step 1: Super Admin Login**

Michael logs in at selectify.com/login

Enters email: michael.chen@selectify.com

Enters password

Dashboard shows: "Platform Overview", "Manage Clubs", "Manage Users", "System Reports"

**Step 2: Creating New Club**

Michael clicks "Manage Clubs" → "Add New Club"

Enters:

Club Name: "Thunderbirds Netball Club"

Location: "Sydney, NSW"

Contact Email: "info@thunderbirds.netball.au"

Phone: "+61 2 9876 5432"

Clicks "Create Club"

System creates club with ID: CLB-2024-001

**Step 3: Creating Club Admin Account**

Michael clicks "Manage Users" → "Add New User"

Selects role: "Club Admin"

Assigns to club: "Thunderbirds Netball Club"

Enters:

Full Name: "Sarah Johnson"

Email: sarah.johnson@thunderbirds.netball.au

Phone: "+61 412 345 678"

Temporary Password: (system generates: TempPass2024!)

Clicks "Create Account"

System sends welcome email to Sarah with:

Login credentials

Link to set new password

Club access instructions

**Step 4: Club Admin First Login**

Sarah receives email: "Welcome to Selectify - Thunderbirds Netball Club"

Clicks "Set Your Password"

Enters new password: Thunderbirds2024!

Logs in

Dashboard shows: "Welcome Sarah! Thunderbirds Netball Club"

Sees: "Players", "Trials", "Selectors", "Reports", "Settings"


**Example 2: Club Admin Sets Up Complete Trial**

**Characters:**

**Sarah Johnson** - Club Admin

**Emma Wilson** - Player (will register)

**John Martinez** - Selector

**Mary Thompson** - Selector

**Step-by-Step Flow:**

**Step 1: Sarah Creates Selectors**

Sarah clicks "Selectors" → "Add New Selector"

Adds John Martinez:

Name: "John Martinez"

Email: john.martinez@thunderbirds.netball.au

Phone: "+61 423 456 789"

Experience: "Level 2 Certified Selector"

Clicks "Create"

Repeats for Mary Thompson

Both receive welcome emails with login credentials

**Step 2: Sarah Creates New Trial Event**

Sarah clicks "Trials" → "Create New Trial"

Enters:

Trial Name: "2024 Spring Selection Trials"

Start Date: March 15, 2024

End Date: March 22, 2024

Venue: "Sydney Sports Centre, Court 1-4"

Registration Fee: $75.00 AUD

Max Players: 120

Age Groups: "U16, U18, Open"

Clicks "Save Trial"

System creates Trial ID: TRI-2024-001

**Step 3: Sarah Schedules Trial Rounds**

Sarah clicks "Schedule Rounds"

Creates Round 1:

Date: March 15, 2024

Time: 9:00 AM - 12:00 PM

Courts: Court 1, Court 2

Game Duration: 20 minutes

Creates Round 2:

Date: March 16, 2024

Time: 9:00 AM - 12:00 PM

Courts: Court 1, Court 2

Saves schedule

**Step 4: Sarah Sends Invitations**

Sarah clicks "Invite Players"

Uploads CSV with 80 player emails or enters manually

System sends invitation emails:

Subject: "Invitation: 2024 Spring Selection Trials - Thunderbirds Netball Club"

Content: "You're invited! Register now and secure your spot."

Registration link: selectify.com/register/TRI-2024-001


**Example 3: Player Registration & Payment Flow**

**Characters:**

**Emma Wilson** - Player (Age 17, U18 category)

**Step-by-Step Flow:**

**Step 1: Emma Receives Invitation**

Emma receives email: "You're Invited: 2024 Spring Selection Trials"

Clicks "Register Now" button

Redirected to registration page

**Step 2: Emma Creates Account**

Clicks "Sign Up"

Enters:

Email: emma.wilson@email.com

Password: EmmaNetball2024!

Full Name: "Emma Wilson"

Date of Birth: March 10, 2007

Phone: "+61 456 789 012"

Clicks "Create Account"

System sends verification email

Emma verifies email

**Step 3: Emma Completes Registration**

Logs in and sees: "Complete Your Trial Registration"

Enters:

Preferred Positions: "Goal Attack" (Primary), "Wing Attack" (Secondary)

Medical Conditions: "None"

Emergency Contact: "Jane Wilson (Mother) - +61 456 789 013"

Previous Club: "Sydney Juniors Netball"

Uploads profile photo (system validates: max 2MB, JPG/PNG)

Clicks "Continue to Payment"

**Step 4: Payment Process**

Payment page shows:

Trial: "2024 Spring Selection Trials"

Fee: $75.00 AUD

Payment Method: Credit Card / PayPal / Bank Transfer

Emma selects "Credit Card"

Enters:

Card Number: 4532 1234 5678 9010

Expiry: 12/25

CVV: 123

Cardholder Name: "Emma Wilson"

Clicks "Pay $75.00"

System processes via secure payment gateway

Payment status: "Processing..."

**Step 5: Payment Confirmation**

Payment gateway processes (Stripe/PayPal)

Webhook received: Payment successful

System updates:

Payment Status: "Paid"

Transaction ID: TXN-2024-001234

Payment Date: March 1, 2024, 2:30 PM

Emma receives confirmation email:

Subject: "Payment Confirmed - Your Trial Registration"

Content: "Your payment of $75.00 has been received. Your Player ID will be assigned on trial day."

Emma's dashboard shows: "Registration Complete - Awaiting Trial Assignment"

**Step 6: Player ID Assignment**

On March 14 (day before trial), Sarah runs "Assign Player IDs"

System assigns IDs 1-80 to registered players

Emma receives email:

Subject: "Your Player ID: #42 - Trial Tomorrow!"

Content: "Your Player ID is #42. Please wear this number during the trial."

Emma's profile now shows: "Player ID: #42"


**Example 4: Trial Day - Check-in & Fitness Tests**

**Characters:**

**Emma Wilson** - Player #42

**Sarah Johnson** - Club Admin (managing check-in)

**Dr. Lisa Brown** - Fitness Test Administrator

**Step-by-Step Flow:**

**Step 1: Emma Arrives at Venue**

Emma arrives at Sydney Sports Centre at 8:30 AM

Sees check-in station (tablet/iPad)

Sarah is managing check-in

**Step 2: Check-in Process**

Emma approaches check-in station

Sarah selects "Check-in Player"

Enters Player ID: 42 or scans QR code from Emma's phone

System shows:

Name: "Emma Wilson"

Photo: (displays uploaded photo)

Status: "Registered & Paid"

Sarah clicks "Check In"

System updates:

Check-in Time: 8:32 AM

Status: "Checked In"

Assigned to: "Court 1 - Round 1"

Emma receives SMS: "Welcome Emma! You're checked in. Your first game is at 9:00 AM on Court 1."

**Step 3: Fitness Tests**

Emma proceeds to fitness testing area

Dr. Lisa Brown (fitness administrator) logs in

Selects "Fitness Tests" → "Record Results"

Enters Player name/emailID

Records:

**Bronco Test**: 4 minutes 32 seconds( Dr will add the bronco test results in the field)

**Yo-Yo Test**: Level 12.3( Dr will add the Yo-Yo Test results in the field)

**Vertical Jump**: 45 cm( Dr will add the Vertical Jump test results in the field)

**Press-ups**: 25 reps( Dr will add the Press-ups test results in the field)

Dr(fitness admin) can add/create more tests and add their results as well

Clicks "Save Results" button

System stores in player's profile

player's profile updates in real-time


**Example 5: Game Generation & Player Assignment**

**Characters:**

**Sarah Johnson** - Club Admin

**Emma Wilson** - Player #42

**Step-by-Step Flow:**

**Step 1: Sarah Generates Games**

After check-in (80 players checked in), Sarah clicks "Generate Games"

System calculates:

80 players ÷ 10 per game = 8 games needed

2 courts × 4 time slots = 8 games possible

Sarah clicks "Auto-Generate Round 1 Games"

System creates:

Game 1: Court 1, 9:00 AM (Players: #1-10)

Game 2: Court 2, 9:00 AM (Players: #11-20)

Game 3: Court 1, 9:30 AM (Players: #21-30)

Game 4: Court 2, 9:30 AM (Players: #31-40)

Game 5: Court 1, 10:00 AM (Players: #41-50) ← Emma is here

Game 6: Court 2, 10:00 AM (Players: #51-60)

Game 7: Court 1, 10:30 AM (Players: #61-70)

Game 8: Court 2, 10:30 AM (Players: #71-80)

**Step 2: Sarah Assigns Players to Teams**

Sarah clicks "Game 5" → "Assign Teams"

System auto-splits players #41-50:

Team A: #41, #43, #45, #47, #49

Team B: #42 (Emma), #44, #46, #48, #50

Sarah reviews and adjusts positions:

Emma (#42) - Team B, Position: Goal Attack ✓ (matches preference)

Player #44 - Team B, Position: Goal Keeper

Player #46 - Team B, Position: Wing Defence

Player #48 - Team B, Position: Centre

Player #50 - Team B, Position: Goal Shooter

System alerts: "All positions assigned correctly"

Sarah clicks "Lock Game List"

System prevents further changes

**Step 3: Sarah Assigns Selectors**

Sarah clicks "Assign Selectors" for Game 5

Selects:

John Martinez (Primary Selector)

Mary Thompson (Secondary Selector)

Both receive notifications: "You're assigned to Game 5, Court 1, 10:00 AM"


**Example 6: Selector Rating Players (Online)**

**Characters:**

**John Martinez** - Selector

**Emma Wilson** - Player #42

**Step-by-Step Flow:**

**Step 1: John Logs In**

<!-- John receives notification: "Game 5 starts in 15 minutes" -->

Logs in at selectify.com/selector

Dashboard shows: "Your Assigned Games"

Sees: "Game 5 - Court 1 - 10:00 AM - Starting Soon"

**Step 2: John Views Game List**

John clicks "Game 5"

Sees:

Team A: Players #41, #43, #45, #47, #49 (positions shown)

Team B: Players #42, #44, #46, #48, #50 (positions shown)

Note: Only player numbers and positions visible (no names for unbiased rating)

**Step 3: Game Starts - Real-time Rating**

Game begins at 10:00 AM

John uses dashboard to rate players

For Player #42 (Emma - Goal Attack):

Clicks "Rate Player #42"

Selects Rating: **4 out of 5** ⭐⭐⭐⭐

Clicks "Add Comment"



Clicks "Save Rating"

System saves:

Rating: 4/5

Comment: "Strong shooting accuracy, good court awareness, needs work on defensive pressure"

Timestamp: 10:15 AM

Selector: John Martinez

**Step 4: John Rates All Players**

John continues rating all  players during the game

System saves all ratings in real-time

After game ends, John clicks "Submit Game Ratings"

System confirms: "All ratings submitted successfully"


**Example 7: Selector Rating Players (Offline/Paper)**

**Characters:**

**Mary Thompson** - Selector (prefers paper)

**Step-by-Step Flow:**

**Step 1: Mary Prints Game Sheet**

Mary logs in before game

Clicks "Game 5" → "Print Game Sheet"

System generates PDF with:

Game details (Court, Time, Date)

Team A: Player numbers and positions (blank rating columns)

Team B: Player numbers and positions (blank rating columns)

Space for comments

Mary prints the sheet

**Step 2: Mary Rates During Game**

During Game 5, Mary marks ratings on paper:

Player #42: Rating 4, Comment: "Excellent shooting, quick movements"

Player #44: Rating 3, Comment: "Good defence, slow transitions"

(continues for all players)

**Step 3: Sarah Inputs Offline Ratings**

After trial day, Mary gives paper sheet to Sarah

Sarah logs in as Club Admin

Clicks "Games" → "Game 5" → "Enter Offline Ratings"

Selects Selector: "Mary Thompson"

Enters ratings:

Player #42: Rating 4, Comment: "Excellent shooting, quick movements"

Player #44: Rating 3, Comment: "Good defence, slow transitions"

(continues for all players)

Clicks "Save All Ratings"

System merges with John's online ratings

Both selectors' ratings now in system


**Example 8: Round 2 & Multiple Ratings**

**Characters:**

**Emma Wilson** - Player #42

**Sarah Johnson** - Club Admin

**Step-by-Step Flow:**

**Step 1: Sarah Generates Round 2**

After Round 1, Sarah clicks "Generate Round 2"

System ensures: "No player plays twice in same round"

Emma (#42) assigned to:

Game 12: Court 2, 2:00 PM

Team A, Position: Wing Attack (secondary position)

**Step 2: Multiple Selectors Rate Emma**

Game 12 has 3 selectors: John, Mary, and new selector Tom

All rate Emma (#42):

John: 4/5 - "Good positioning, needs more assertiveness"

Mary: 5/5 - "Outstanding performance, great team play"

Tom: 4/5 - "Strong player, consistent performance"

System calculates average: (4 + 5 + 4) / 3 = **4.33/5**

**Step 3: Position Conflict Alert**

Sarah tries to assign Emma to Goal Keeper (not her preferred position)

System alerts: "⚠️ Player #42 prefers Goal Attack/Wing Attack. Assigning to Goal Keeper may affect performance."

Sarah confirms: "Yes, assign anyway" (for testing versatility)

System allows but flags in reports


**Example 9: End of Trial - Reporting & Callbacks**

**Characters:**

**Sarah Johnson** - Club Admin

**Emma Wilson** - Player #42

**Michael Chen** - Super Admin (viewing platform reports)

**Step-by-Step Flow:**

**Step 1: Sarah Generates Player Reports**

After all rounds complete, Sarah clicks "Reports" → "Player Performance"

Selects Player: #42 (Emma Wilson)

System generates report showing:

**Overall Rating**: 4.33/5 (average across all games)

**Position Performance**:

Goal Attack: 4.2/5 (3 games)

Wing Attack: 4.5/5 (2 games)

**Fitness Test Results**:

Bronco: 4:32 (Above Average)

Vertical Jump: 45cm (Good)

Press-ups: 25 (Excellent)

**Selector Feedback Summary**:

"Strong shooting accuracy"

"Good court awareness"

"Outstanding team play"

"Needs work on defensive pressure"

**Games Played**: 5 games across 2 rounds

**Consistency**: High (ratings: 4, 4, 5, 4, 4)

**Step 2: Sarah Exports Report**

Sarah clicks "Export as PDF"

System generates professional PDF report

Sarah can also export as CSV for spreadsheet analysis

**Step 3: Sarah Decides Callbacks**

Sarah reviews all 80 players

Creates "Callback List":

Player #42 (Emma) - ✅ CALLBACK (Rating: 4.33)

Player #15 - ✅ CALLBACK (Rating: 4.8)

Player #67 - ❌ No Callback (Rating: 2.5)

(continues for all players)

**Step 4: System Sends End-of-Trial Emails**

Sarah clicks "Send Trial Summary Emails"

System sends personalized emails to all players:

**For Emma (Callback)**:

Subject: "Congratulations! Callback for Next Round - Thunderbirds Trials"

Content: "Your overall rating: 4.33/5. You've been selected for callbacks!"

Attached: Her performance report PDF

**For others (No Callback)**:

Subject: "Thank You - 2024 Spring Selection Trials"

Content: "Your overall rating: [X]/5. Thank you for participating."

Attached: Their performance report PDF

**Step 5: Super Admin Views Platform Reports**

Michael (Super Admin) logs in

Clicks "Platform Reports"

Sees:

Total Trials: 12 (across all clubs)

Total Players: 960 registered

Total Revenue: $72,000 (960 × $75)

Average Player Rating: 3.7/5

Most Active Club: Thunderbirds Netball Club

Exports platform-wide analytics


**Example 10: Payment Issues & Refunds**

**Characters:**

**David Lee** - Player (payment issue)

**Sarah Johnson** - Club Admin

**Step-by-Step Flow:**

**Step 1: Payment Failure**

David tries to register and pay

Payment fails (insufficient funds)

System shows: "Payment Failed - Please try again"

David's registration status: "Pending Payment"

**Step 2: Sarah Views Payment Status**

Sarah clicks "Players" → "Payment Status"

Sees: "David Lee - Payment Failed"

Sarah can:

Send reminder email

Mark as "Payment Waived" (if scholarship)

Wait for retry

**Step 3: David Retries Payment**

David receives reminder email

Logs in, clicks "Retry Payment"

Uses different card, payment succeeds

System updates: "Payment Confirmed"

David receives confirmation

**Step 4: Refund Scenario**

Player cancels registration before trial

Sarah processes refund:

Clicks "Players" → "David Lee" → "Process Refund"

Enters refund amount: $75.00

Reason: "Player cancellation"

Clicks "Issue Refund"

System processes via payment gateway

David receives refund in 3-5 business days

System updates: "Refund Processed - $75.00"


**Complete User Journey Summary**

**Super Admin (Michael)**:

Creates clubs and assigns club admins

Monitors platform-wide activity

Views system reports and analytics

Manages payments and platform settings

**Club Admin (Sarah)**:

Creates trials and invites players

Manages selectors and game schedules

Handles check-ins and fitness tests

Generates games and assigns players

Reviews ratings and generates reports

Decides callbacks and sends notifications

**Selector (John/Mary)**:

Receives game assignments

Rates players online or offline

Provides feedback via voice-to-text or written comments

Submits ratings in real-time or via admin input

**Player (Emma)**:

Receives invitation and creates account

Completes registration and pays fee

Receives player ID

Checks in on trial day

Completes fitness tests

Plays assigned games

Receives performance report and callback decision



# Client Feedback and Comments

The following section contains all comments, feedback, and change requests provided by the client during the requirements review process. Each comment has been documented for reference and implementation.


## Comment #1

*Author: derek orchard | Date: 2025-12-09T07:25:00Z*

Not  necessary here. The Player ID is assigned when they check in to the first trial. If there are multiple trials for this club/team. The number needs to stay with them for the subsequent trials. QR code is not necesssary


## Comment #2

*Author: derek orchard | Date: 2025-12-09T07:26:00Z*

these should be called "rounds".


## Comment #3

*Author: derek orchard | Date: 2025-12-09T07:27:00Z*

This should not be seen by the player only admins


## Comment #4

*Author: derek orchard | Date: 2025-12-09T07:28:00Z*

as above


## Comment #5

*Author: derek orchard | Date: 2025-12-09T09:12:00Z*

It doesnt have to look like this dashboard but this is what I have previously generated


## Comment #6

*Author: derek orchard | Date: 2025-12-09T07:31:00Z*

This is dependent on what they can see in the system. My vision is that they just get links to the game lists where they can add their ratings/comments and submit.


## Comment #7

*Author: derek orchard | Date: 2025-12-09T07:33:00Z*

This is a user pay model and the fee is set by Selectify and collected when the player registers. The club has no role in setting/collecting money.


## Comment #8

*Author: derek orchard | Date: 2025-12-09T07:35:00Z*

Just making sure that clubs will also see the trial name : 2024 Spring Selection Trials  in their dashboard not just the system generated Trial ID.


## Comment #9

*Author: derek orchard | Date: 2025-12-09T07:35:00Z*

The also need to be able to copy the link so that it can be included on social media, websites, etc. beyond the email


## Comment #10

*Author: derek orchard | Date: 2025-12-09T07:41:00Z*

Does she need to create an account? Or can she just register?


## Comment #11

*Author: derek orchard | Date: 2025-12-09T09:24:00Z*

If there are health alerts - these need to follow the player through the trial process and also through the team list process so that appropriate personnel are aware of any health concerns.


## Comment #12

*Author: derek orchard | Date: 2025-12-09T09:24:00Z*

Not relevant


## Comment #13

*Author: derek orchard | Date: 2025-12-09T07:44:00Z*

the fee is $7.50 per player


## Comment #14

*Author: derek orchard | Date: 2025-12-09T07:46:00Z*

This should only be done when they check in for the trial. They can be sent a trial reminder the day before and any relevant information that the club has for them.


## Comment #15

*Author: derek orchard | Date: 2025-12-09T07:47:00Z*

As above.


## Comment #16

*Author: derek orchard | Date: 2025-12-09T07:47:00Z*

not relevant


## Comment #17

*Author: derek orchard | Date: 2025-12-09T07:48:00Z*

Not relevant to players at Check In as they will need to wait until all the players are checked in to allocate game lists.


## Comment #18

*Author: derek orchard | Date: 2025-12-09T07:50:00Z*

can there also be an option to add any further testing requirements that clubs need. These are standard but they may wish to do others depending on the level of the athletes


## Comment #19

*Author: derek orchard | Date: 2025-12-09T08:30:00Z*

14 per game. there are 7 on each time.


## Comment #20

*Author: derek orchard | Date: 2025-12-09T08:32:00Z*

Teams need to have 7 players in the following positions: GS, GA, WA, C, WD, GD, GK. these positions are dependant on the player positions that they provided when they registered. It does not matter if trialists play in multiple games and different positions in each round. This is normal.


## Comment #21

*Author: derek orchard | Date: 2025-12-09T08:33:00Z*

the player numbers and games need to be auto generated. So the numbers should be all jumbled against each other.


## Comment #22

*Author: derek orchard | Date: 2025-12-09T08:34:00Z*

Please ensure 7 players per team and two teams playing each other on each court. The players needs to be placed on court in their preferred positions. Only Sarah in this case should be able to see players names and numbers


## Comment #23

*Author: derek orchard | Date: 2025-12-09T08:41:00Z*

You will recall a requirement for team colours instead of A and B. these colours need to be selected by the administrator so that players know which colour "bib" to wear when they take the court.


## Comment #24

*Author: derek orchard | Date: 2025-12-09T08:35:00Z*

and a link to the rating and feedback portal for this game.


## Comment #25

*Author: derek orchard | Date: 2025-12-09T08:39:00Z*

7 players in each team. the selector should see the position (GS) and the player associated to that positions number. It would be ideal if this was in a grid  with two columns of the Red Team and Blue Team. Red team would have their list going down their column as GS, GA, WA, C, WD, GD, GK and the Blue Team would have their list going down the opposite column as GK, GD, WD, C, WA, GA, GK. These are the opposing positions down the court.


## Comment #26

*Author: derek orchard | Date: 2025-12-09T08:40:00Z*

It would be good if he could submit his ratings all from the same page at the same time. as he trial progresses he might see something that he likes from the C. So he mentions it in text or he might want to add something to the GD who just got an intercept, etc. All ratings should be submitted at the same time.


## Comment #27

*Author: derek orchard | Date: 2025-12-09T08:42:00Z*

It would be tedious to be jumping in and out of player ratings whilst you are trying to monitor the game and players


## Comment #28

*Author: derek orchard | Date: 2025-12-09T08:43:00Z*

Can the administrator do this for her?


## Comment #29

*Author: derek orchard | Date: 2025-12-09T08:43:00Z*

Can you ensure that you utilise the PDF that I provided you for this.


## Comment #30

*Author: derek orchard | Date: 2025-12-09T08:44:00Z*

Good. This needs to show "Playing out of Position" as the alert.


## Comment #31

*Author: derek orchard | Date: 2025-12-09T09:05:00Z*

The player photo needs to come up when viewing their report.


## Comment #32

*Author: derek orchard | Date: 2025-12-09T08:58:00Z*

What happens next for Call Back Trials? From here this callback group needs to be invited to another trial and go through the trial process again as per the above steps, roles, etc.


## Comment #33

*Author: derek orchard | Date: 2025-12-09T09:04:00Z*

The player information/ratings/feedback/testing for players that receive a callback needs to go with them to the next trial. This needs to be identified as Trial 1 rating and information. They also need to keep their number in the next trial.


## Comment #34

*Author: derek orchard | Date: 2025-12-09T08:59:00Z*

For the players that dont get called back they may still later be considered for a club team. Is there any way to separate trials where they are considered any further, and players that may later be assigned to a lower graded team?


## Comment #35

*Author: derek orchard | Date: 2025-12-09T08:46:00Z*

Players dont need to see this.


## Comment #36

*Author: derek orchard | Date: 2025-12-09T08:47:00Z*

Not necessary.


## Comment #37

*Author: derek orchard | Date: 2025-12-09T08:47:00Z*

Not necessary.


## Comment #38

*Author: derek orchard | Date: 2025-12-09T08:48:00Z*

instead of this report can you provide an opportunity for club administrators to provide feedback to the player.


## Comment #39

*Author: derek orchard | Date: 2025-12-09T08:48:00Z*

Not relevant for clubs. this is a user pay platform to Selectify. Club's do not collect a fee for trials.


## Comment #40

*Author: derek orchard | Date: 2025-12-09T08:50:00Z*

This shouldnt be an issue for clubs just for Selectify as a business. Clubs should be able to ask Selectify for a code for trialists who are experiencing hardship. trialists could enter this at registration.


## Comment #41

*Author: derek orchard | Date: 2025-12-09T09:00:00Z*

not relevant to clubs


## Comment #42

*Author: derek orchard | Date: 2025-12-09T09:02:00Z*

A further role here needs to be setting up trials for players called back. And also assigning players to teams at the conclusion of trials. When assigning players to teams they need to have a team name, coach, manager and this list is then compiled and forwarded to the coach and manager to contact their team. The list needs to have player contact information, any declared health information, playing positions


## Comment #43

*Author: derek orchard | Date: 2025-12-09T09:02:00Z*

They also need to have an ability to archive trials once they have been completed and teams announced.


## Comment #44

*Author: derek orchard | Date: 2025-12-09T09:03:00Z*

After Check in on trial day



# Implementation Notes

This document serves as the authoritative source for the Selectify project requirements. All client feedback has been captured and should be reviewed during the implementation phase.


Key Action Items:

Review all client comments and integrate feedback into project plan

Update project timeline based on new requirements

Schedule follow-up meeting to clarify any outstanding questions


End of Document
