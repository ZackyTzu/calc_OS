// Hand-written TI-BASIC games for the TI-84 Plus CE. Pure TI-BASIC: they run on every OS version.
import type { GeneratedProgram } from './academic';

/** Swap columns 1<->4 and 2<->3 of [A] (mirror left/right). */
const MIRROR = `For(I,1,4)
[A](I,1)->T
[A](I,4)->[A](I,1)
T->[A](I,4)
[A](I,2)->T
[A](I,3)->[A](I,2)
T->[A](I,3)
End`;

/** Slide every row of [A] to the left, merging equal neighbours once, adding merges to S. */
const SLIDE_LEFT = `For(I,1,4)
seq([A](I,J),J,1,4)->L2
{0,0,0,0}->L3
0->P
For(J,1,4)
If L2(J)!=0
Then
P+1->P
L2(J)->L3(P)
End
End
For(J,1,3)
If L3(J)!=0 and L3(J)=L3(J+1)
Then
2*L3(J)->L3(J)
0->L3(J+1)
S+L3(J)->S
End
End
L3->L2
{0,0,0,0}->L3
0->P
For(J,1,4)
If L2(J)!=0
Then
P+1->P
L2(J)->L3(P)
End
End
For(J,1,4)
L3(J)->[A](I,J)
End
End`;

const g2048 = `ClrHome
{4,4}->dim([A])
Fill(0,[A])
0->S
2->N
Disp "2048","","SLIDE TILES WITH ARROWS.","EQUAL TILES MERGE.","REACH 2048!","","CLEAR QUITS.","","PRESS ENTER"
Repeat getKey=105
End
ClrHome
Lbl 0
0->E
For(I,1,4)
For(J,1,4)
If [A](I,J)=0:E+1->E
End
End
If E=0:Goto 9
randInt(1,E)->P
0->E
For(I,1,4)
For(J,1,4)
If [A](I,J)=0
Then
E+1->E
If E=P:2+2*(rand<.1)->[A](I,J)
End
End
End
N-1->N
If N>0:Goto 0
Lbl 1
For(I,1,4)
For(J,1,4)
Output(2*I-1,6*J-5,"     ")
If [A](I,J)!=0:Output(2*I-1,6*J-5,[A](I,J))
End
End
Output(9,1,"ARROWS MOVE  CLEAR QUIT")
Output(10,1,"SCORE "+toString(S)+"     ")
Lbl 2
Repeat K=24 or K=25 or K=26 or K=34 or K=45
getKey->K
End
If K=45:Goto 8
[A]->[B]
If K=25 or K=34:[A]^^T->[A]
If K=26 or K=34
Then
${MIRROR}
End
${SLIDE_LEFT}
If K=26 or K=34
Then
${MIRROR}
End
If K=25 or K=34:[A]^^T->[A]
0->C
For(I,1,4)
For(J,1,4)
If [A](I,J)!=[B](I,J):1->C
End
End
If C=0:Goto 2
1->N
Goto 0
Lbl 9
0->C
For(I,1,4)
For(J,1,3)
If [A](I,J)=[A](I,J+1) or [A](J,I)=[A](J+1,I):1->C
End
End
If C=1:Goto 1
Lbl 8
ClrHome
Disp "GAME OVER","","SCORE: "+toString(S)
Return`;

const snake = `ClrHome
Disp "SNAKE","","ARROWS TO STEER.","EAT * TO GROW.","WALLS AND YOUR OWN","TAIL END THE GAME.","","PRESS ENTER"
Repeat getKey=105
End
ClrHome
13->X
5->Y
{13,12,11}->L1
{5,5,5}->L2
1->U
0->V
0->S
0->N
For(I,1,3)
Output(L2(I),L1(I),"O")
End
Output(10,1,"SCORE 0   CLEAR = QUIT")
Lbl 5
0->N
randInt(1,26)->F
randInt(1,8)->G
If sum((L1=F) and (L2=G))>0:Goto 5
Output(G,F,"*")
Lbl 1
Wait .08
getKey->K
If K=45:Goto 9
If K=24 and U!=1
Then
~1->U
0->V
End
If K=26 and U!=~1
Then
1->U
0->V
End
If K=25 and V!=1
Then
0->U
~1->V
End
If K=34 and V!=~1
Then
0->U
1->V
End
X+U->X
Y+V->Y
If X<1 or X>26 or Y<1 or Y>8:Goto 9
If sum((L1=X) and (L2=Y))>0:Goto 9
augment({X},L1)->L1
augment({Y},L2)->L2
Output(Y,X,"O")
If X=F and Y=G
Then
S+1->S
Output(10,7,S)
1->N
Else
Output(L2(dim(L2)),L1(dim(L1))," ")
dim(L1)-1->dim(L1)
dim(L2)-1->dim(L2)
End
If N=1:Goto 5
Goto 1
Lbl 9
ClrHome
Disp "GAME OVER","","SCORE: "+toString(S),"LENGTH: "+toString(dim(L1))
Return`;

/** Sets W to 1 when player P owns a full line of L1 (uses loop variable Q). */
const WIN_CHECK = `0->W
For(Q,0,7)
If L1(L2(3*Q+1))=P and L1(L2(3*Q+2))=P and L1(L2(3*Q+3))=P:1->W
End`;

const tictac = `ClrHome
{0,0,0,0,0,0,0,0,0}->L1
{1,2,3,4,5,6,7,8,9,1,4,7,2,5,8,3,6,9,1,5,9,7,5,3}->L2
Disp "TIC TAC TOE","","YOU ARE X.","PRESS THE NUMBER KEY","OF A CELL, LAID OUT","LIKE THE KEYPAD:","7 8 9 / 4 5 6 / 1 2 3","","PRESS ENTER"
Repeat getKey=105
End
ClrHome
Output(3,11,"-+-+-")
Output(5,11,"-+-+-")
Output(2,12,"|")
Output(2,14,"|")
Output(4,12,"|")
Output(4,14,"|")
Output(6,12,"|")
Output(6,14,"|")
Output(9,1,"YOUR TURN. CLEAR QUITS.")
Lbl 1
For(I,1,9)
" "->Str1
If L1(I)=1:"X"->Str1
If L1(I)=2:"O"->Str1
Output(2*(3-int((I-1)/3)),11+2*remainder(I-1,3),Str1)
End
If sum(L1=0)=0:Goto 7
Lbl 2
Repeat K=45 or (K>=92 and K<=94) or (K>=82 and K<=84) or (K>=72 and K<=74)
getKey->K
End
If K=45:Return
If K>=92:K-91->C
If K>=82 and K<=84:K-78->C
If K<=74:K-65->C
If L1(C)!=0:Goto 2
1->L1(C)
1->P
${WIN_CHECK}
If W=1:Goto 6
If sum(L1=0)=0:Goto 7
0->M
For(I,1,9)
If L1(I)=0 and M=0
Then
2->L1(I)
2->P
${WIN_CHECK}
0->L1(I)
If W=1:I->M
End
End
If M=0
Then
For(I,1,9)
If L1(I)=0 and M=0
Then
1->L1(I)
1->P
${WIN_CHECK}
0->L1(I)
If W=1:I->M
End
End
End
If M=0 and L1(5)=0:5->M
If M=0
Then
{1,3,7,9}->L3
randIntNoRep(1,4)->L4
For(J,1,4)
If M=0 and L1(L3(L4(J)))=0:L3(L4(J))->M
End
End
If M=0
Then
For(I,1,9)
If M=0 and L1(I)=0:I->M
End
End
2->L1(M)
2->P
${WIN_CHECK}
If W=1:Goto 5
Goto 1
Lbl 5
Output(9,1,"I WIN! ENTER TO REPLAY.")
Goto 8
Lbl 6
Output(9,1,"YOU WIN! ENTER = AGAIN ")
Goto 8
Lbl 7
Output(9,1,"DRAW. ENTER TO REPLAY. ")
Lbl 8
For(I,1,9)
" "->Str1
If L1(I)=1:"X"->Str1
If L1(I)=2:"O"->Str1
Output(2*(3-int((I-1)/3)),11+2*remainder(I-1,3),Str1)
End
Repeat K=105 or K=45
getKey->K
End
If K=45:Return
{0,0,0,0,0,0,0,0,0}->L1
Output(9,1,"YOUR TURN. CLEAR QUITS.")
Goto 1`;

/** Value of hand in list Lx into V (aces count 11 when that does not bust). */
function handValue(list: string): string {
  return `sum(seq(min(${list}(I),10),I,1,dim(${list})))->V
If sum(${list}=1)>0 and V+10<=21:V+10->V`;
}
function handText(list: string, str: string): string {
  return `""->${str}
For(I,1,dim(${list}))
${str}+sub("A23456789TJQK",${list}(I),1)+" "->${str}
End`;
}

const blackjack = `ClrHome
100->M
Lbl 0
ClrHome
Disp "BLACKJACK","","DEALER STANDS ON 17.","BLACKJACK PAYS 3:2.","","MONEY: $"+toString(M)
If M<1
Then
Disp "YOU ARE BROKE. BYE!"
Pause 
Return
End
Input "BET (0=QUIT): ",B
If B<=0:Return
If B>M:M->B
{randInt(1,13),randInt(1,13)}->L1
{randInt(1,13),randInt(1,13)}->L2
Lbl 1
${handValue('L1')}
${handText('L1', 'Str1')}
ClrHome
Disp "DEALER: "+sub("A23456789TJQK",L2(1),1)+" ?"
Disp "YOU: "+Str1
Disp "TOTAL "+toString(V)
If V>21:Goto 8
If V=21 and dim(L1)=2:Goto 7
Menu("YOUR MOVE","Hit",2,"Stand",3)
Lbl 2
augment(L1,{randInt(1,13)})->L1
Goto 1
Lbl 3
V->Z
${handValue('L2')}
While V<17
augment(L2,{randInt(1,13)})->L2
${handValue('L2')}
End
${handText('L2', 'Str2')}
ClrHome
Disp "DEALER: "+Str2
Disp "DEALER TOTAL "+toString(V)
Disp "YOU: "+Str1
Disp "YOUR TOTAL "+toString(Z)
If V>21 or Z>V
Then
Disp "YOU WIN $"+toString(B)
M+B->M
Else
If Z=V
Then
Disp "PUSH. BET RETURNED."
Else
Disp "DEALER WINS. -$"+toString(B)
M-B->M
End
End
Pause 
Goto 0
Lbl 7
ClrHome
Disp "BLACKJACK!","YOU WIN $"+toString(1.5*B)
M+1.5*B->M
Pause 
Goto 0
Lbl 8
Disp "BUST! YOU LOSE $"+toString(B)
M-B->M
Pause 
Goto 0`;

const poker = `ClrHome
100->M
Lbl 0
ClrHome
Disp "VIDEO POKER","JACKS OR BETTER","","PAYS (X BET): PAIR J+ 1","2 PAIR 2  3 KIND 3","STRAIGHT 4  FLUSH 6","FULL HOUSE 9  4 KIND 25","STR FLUSH 50  ROYAL 250","","CREDITS: "+toString(M)
If M<1
Then
Disp "OUT OF CREDITS."
Pause 
Return
End
Input "BET (0=QUIT): ",B
If B<=0:Return
If B>M:M->B
randIntNoRep(1,52)->L1
seq(L1(I),I,1,5)->L2
{0,0,0,0,0}->L3
6->P
Lbl 1
ClrHome
Disp "1-5 TOGGLES HOLD.","ENTER DRAWS."
For(I,1,5)
remainder(L2(I)-1,13)+1->R
int((L2(I)-1)/13)+1->U
Output(5,5*I-4,sub("A23456789TJQK",R,1)+sub("SHDC",U,1))
If L3(I)=1:Output(6,5*I-4,"HOLD")
If L3(I)=0:Output(6,5*I-4,"    ")
End
Repeat K=105 or (K>=92 and K<=94) or K=82 or K=83
getKey->K
End
If K=105:Goto 2
If K>=92:K-91->I
If K<=83:K-78->I
1-L3(I)->L3(I)
Goto 1
Lbl 2
For(I,1,5)
If L3(I)=0
Then
L1(P)->L2(I)
P+1->P
End
End
seq(remainder(L2(I)-1,13)+1,I,1,5)->L4
seq(int((L2(I)-1)/13),I,1,5)->L5
SortA(L4)
For(I,1,5)
remainder(L2(I)-1,13)+1->R
int((L2(I)-1)/13)+1->U
Output(5,5*I-4,sub("A23456789TJQK",R,1)+sub("SHDC",U,1))
Output(6,5*I-4,"    ")
End
min(L5)=max(L5)->F
seq(sum(L4=L4(I)),I,1,5)->L6
1->D
For(I,1,4)
If L4(I)=L4(I+1):0->D
End
0->Z
If D=1 and (L4(5)-L4(1)=4 or (L4(1)=1 and L4(2)=10)):1->Z
0->W
"NOTHING"->Str1
If sum(L6=2)=2
Then
For(I,1,5)
If L6(I)=2:L4(I)->R
End
If R=1 or R>=11
Then
1->W
"JACKS OR BETTER"->Str1
End
End
If sum(L6=2)=4
Then
2->W
"TWO PAIR"->Str1
End
If max(L6)=3
Then
3->W
"THREE OF A KIND"->Str1
End
If Z=1
Then
4->W
"STRAIGHT"->Str1
End
If F=1
Then
6->W
"FLUSH"->Str1
End
If max(L6)=3 and sum(L6=2)=2
Then
9->W
"FULL HOUSE"->Str1
End
If max(L6)=4
Then
25->W
"FOUR OF A KIND"->Str1
End
If Z=1 and F=1
Then
50->W
"STRAIGHT FLUSH"->Str1
If L4(1)=1 and L4(2)=10
Then
250->W
"ROYAL FLUSH"->Str1
End
End
M-B+W*B->M
Output(8,1,Str1)
If W=0:Output(9,1,"LOST "+toString(B)+" CREDITS")
If W>0:Output(9,1,"WON "+toString(W*B)+" CREDITS")
Output(10,1,"ENTER TO CONTINUE")
Repeat getKey=105
End
Goto 0`;

export const games: GeneratedProgram[] = [
  { name: 'G2048', source: g2048 },
  { name: 'SNAKE', source: snake },
  { name: 'TICTAC', source: tictac },
  { name: 'BLACKJCK', source: blackjack },
  { name: 'POKER', source: poker },
];
