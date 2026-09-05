// MATHBOT: an offline "ask a math question" assistant in TI-BASIC.
// Type a question in capitals (SOLVE 3X-7=11, FACTOR 360, GCD 12,18, SQRT 72, MEAN 4,8,15) or use the
// menus. Shows steps for linear and quadratic equations. Everything runs on the calculator itself.
import type { GeneratedProgram } from './academic';

/**
 * Copy the text after keyword `kw` (found at position K in Str1) into Str2, or jump to `promptLabel`
 * when nothing follows the keyword.
 */
function restAfter(kw: string, promptLabel: string): string {
  const w = kw.length;
  return [
    `inString(Str1,"${kw}")->K`,
    `If L<K+${w}:Goto ${promptLabel}`,
    `sub(Str1,K+${w},L-K-${w - 1})->Str2`,
  ].join('\n');
}

/** Normalise Str2 into Str3: spaces become commas, duplicate commas collapse, leading/trailing commas go. */
const TO_LIST_TEXT = `","->Str3
For(I,1,length(Str2))
sub(Str2,I,1)->Str4
If Str4=" ":","->Str4
If Str4!="," or sub(Str3,length(Str3),1)!=",":Str3+Str4->Str3
End
If length(Str3)>1:sub(Str3,2,length(Str3)-1)->Str3
If sub(Str3,length(Str3),1)=",":sub(Str3,1,length(Str3)-1)->Str3
expr("{"+Str3+"}")->L1`;

/** Normalise Str2 into Str3 with all spaces removed (for equations and expressions). */
const STRIP_SPACES = `""->Str3
For(I,1,length(Str2))
sub(Str2,I,1)->Str4
If Str4!=" ":Str3+Str4->Str3
End`;

const source = `ClrHome
Float
Lbl M0
Menu("MATHBOT","Ask me (type)",AS,"Solve equation",S2,"Quadratic",Q2,"Factor/prime",F2,"Fractions",FR,"Percent",PC,"Geometry",GM,"Next...",M1,"Quit",QT)
Lbl M1
Menu("MATHBOT 2","Stats of list",T2,"Slope/points",L2,"Derivative",D2,"Integral",I2,"Simplify sqrt",R2,"Help",HL,"Back",M0,"Quit",QT)
Lbl QT
ClrHome
Return
Lbl HL
ClrHome
Disp "Type questions in CAPS."
Disp "Use X as the unknown."
Disp "Separate numbers with"
Disp "commas or spaces."
Disp "Examples:"
Disp "SOLVE 3X-7=11"
Disp "FACTOR 360   SQRT 72"
Disp "GCD 12,18   MEAN 4,8,15"
Disp "DERIV X^2 AT 3"
Pause 
Goto M0
Lbl AS
ClrHome
Disp "Ask a math question"
Disp "(CAPS, X = unknown):"
Input "ASK:",Str1
length(Str1)->L
If inString(Str1,"SOLVE"):Goto S1
If inString(Str1,"FACTOR") or inString(Str1,"PRIME"):Goto F1
If inString(Str1,"GCD") or inString(Str1,"LCM"):Goto G1
If inString(Str1,"SQRT"):Goto R1
If inString(Str1,"MEAN") or inString(Str1,"AVG") or inString(Str1,"AVERAGE"):Goto T1
If inString(Str1,"SLOPE"):Goto L1
If inString(Str1,"DERIV"):Goto D1
If inString(Str1,"INTEG"):Goto I1
If inString(Str1,"%") or inString(Str1,"PERCENT"):Goto PC
If inString(Str1,"="):Goto S0
Str1->Str2
${STRIP_SPACES}
expr(Str3)->A
ClrHome
Disp Str3
Disp "= "+toString(A)
Disp "As a fraction:"
Disp A>Frac
Pause 
Goto M0
Lbl S0
Str1->Str2
Goto SX
Lbl S1
${restAfter('SOLVE', 'S2')}
Goto SX
Lbl S2
ClrHome
Disp "Type an equation in X,"
Disp "for example 3X-7=11"
Input "EQUATION:",Str2
Lbl SX
${STRIP_SPACES}
inString(Str3,"=")->E
If E=0
Then
Str3->Str5
"0"->Str6
Else
sub(Str3,1,E-1)->Str5
sub(Str3,E+1,length(Str3)-E)->Str6
End
Str5+"-("+Str6+")"->Str7
0->X
expr(Str7)->B
1->X
expr(Str7)->C
2->X
expr(Str7)->D
~1->X
expr(Str7)->F
ClrHome
Disp "Solve for X:"
Disp Str5+"="+Str6
If abs(D-2*C+B)<1|E~9 and abs(C-2*B+F)<1|E~9
Then
C-B->M
If M=0
Then
Disp "No X left: the equation"
Disp "is always or never true."
Else
Disp "Linear: aX + b = 0"
Disp "a = "+toString(M)
Disp "b = "+toString(B)
Disp "aX = -b, so X = -b/a"
~B/M->X
Disp "X = "+toString(X)
Disp X>Frac
End
Else
If abs((D-2*C+B)-(C-2*B+F))<1|E~9
Then
(D-2*C+B)/2->A
C-B-A->P
B->Q
Disp "Quadratic: aX2+bX+c=0"
Disp "a="+toString(A)+" b="+toString(P)
Disp "c="+toString(Q)
P^^2-4*A*Q->R
Disp "b2-4ac = "+toString(R)
If R<0
Then
Disp "Negative: no real X."
Disp "Complex: "+toString(~P/(2*A))
Disp "+/- i "+toString(sqrt(~R)/(2*A))
Else
Disp "X=(-b+/-sqrt(b2-4ac))/2a"
(~P+sqrt(R))/(2*A)->X
(~P-sqrt(R))/(2*A)->Y
Disp "X1 = "+toString(X)
Disp "X2 = "+toString(Y)
End
Else
Disp "Not linear or quadratic:"
Disp "solving numerically..."
solve(expr(Str7),X,1)->X
Disp "X = "+toString(X)
Disp "(one solution near 1)"
End
End
Pause 
Goto M0
Lbl Q2
ClrHome
Disp "aX2 + bX + c = 0"
Input "a=",A
Input "b=",P
Input "c=",Q
ClrHome
Disp "aX2 + bX + c = 0"
P^^2-4*A*Q->R
Disp "b2-4ac = "+toString(R)
Disp "Vertex X = -b/2a ="
Disp ~P/(2*A)
If R<0
Then
Disp "No real roots. Complex:"
Disp toString(~P/(2*A))+" +/- i "+toString(sqrt(~R)/(2*A))
Else
Disp "X=(-b+/-sqrt(b2-4ac))/2a"
Disp "X1 = "+toString((~P+sqrt(R))/(2*A))
Disp "X2 = "+toString((~P-sqrt(R))/(2*A))
End
Pause 
Goto M0
Lbl F1
${restAfter('FACTOR', 'F2').replace('inString(Str1,"FACTOR")->K', 'inString(Str1,"FACTOR")->K\nIf K=0:inString(Str1,"PRIME")->K')}
${TO_LIST_TEXT}
L1(1)->N
Goto F3
Lbl F2
ClrHome
Input "INTEGER N=",N
Lbl F3
abs(int(N))->N
If N<2
Then
Disp "Need an integer >= 2."
Pause 
Goto M0
End
N->Z
""->Str5
2->D
While D*D<=Z
While remainder(Z,D)=0
Str5+toString(D)+"*"->Str5
Z/D->Z
End
D+1->D
End
If Z>1:Str5+toString(Z)+"*"->Str5
sub(Str5,1,length(Str5)-1)->Str5
ClrHome
Disp toString(N)+" ="
Disp Str5
If Str5=toString(N):Disp "It is PRIME."
If Str5!=toString(N):Disp "Not prime."
Pause 
Goto M0
Lbl G1
${restAfter('GCD', 'G2').replace('inString(Str1,"GCD")->K', 'inString(Str1,"GCD")->K\nIf K=0:inString(Str1,"LCM")->K')}
${TO_LIST_TEXT}
L1(1)->A
L1(2)->B
Goto G3
Lbl G2
ClrHome
Input "A=",A
Input "B=",B
Lbl G3
abs(int(A))->A
abs(int(B))->B
ClrHome
Disp "GCD of "+toString(A)+","+toString(B)
Disp "= "+toString(gcd(A,B))
Disp "LCM = "+toString(lcm(A,B))
Disp "(LCM = A*B/GCD)"
Pause 
Goto M0
Lbl R1
${restAfter('SQRT', 'R2')}
${TO_LIST_TEXT}
L1(1)->N
Goto R3
Lbl R2
ClrHome
Input "SQRT OF N=",N
Lbl R3
abs(int(N))->N
int(sqrt(N))->K
While K>1 and remainder(N,K^^2)!=0
K-1->K
End
ClrHome
Disp "sqrt("+toString(N)+") ="
If K<=1:Disp "cannot be simplified"
If K>1:Disp toString(K)+" sqrt("+toString(N/K^^2)+")"
Disp "= "+toString(sqrt(N))
Pause 
Goto M0
Lbl T1
inString(Str1,"MEAN")->K
If K=0:inString(Str1,"AVERAGE")->K
If K=0:inString(Str1,"AVG")->K
sub(Str1,K,L-K+1)->Str2
inString(Str2," ")->E
If E=0:Goto T2
sub(Str2,E+1,length(Str2)-E)->Str2
${TO_LIST_TEXT}
Goto T3
Lbl T2
ClrHome
Disp "Numbers separated by"
Disp "commas or spaces:"
Input "LIST:",Str2
${TO_LIST_TEXT}
Lbl T3
ClrHome
Disp "n = "+toString(dim(L1))
Disp "mean = "+toString(mean(L1))
Disp "median = "+toString(median(L1))
Disp "sum = "+toString(sum(L1))
If dim(L1)>1:Disp "sd (sample) = "+toString(stdDev(L1))
Disp "min = "+toString(min(L1))
Disp "max = "+toString(max(L1))
Pause 
Goto M0
Lbl L1
${restAfter('SLOPE', 'L2')}
${TO_LIST_TEXT}
L1(1)->A
L1(2)->B
L1(3)->C
L1(4)->D
Goto L3
Lbl L2
ClrHome
Disp "Two points (x1,y1),(x2,y2)"
Input "X1=",A
Input "Y1=",B
Input "X2=",C
Input "Y2=",D
Lbl L3
ClrHome
Disp "slope = (y2-y1)/(x2-x1)"
If C=A
Then
Disp "Vertical line x = "+toString(A)
Disp "slope undefined"
Else
(D-B)/(C-A)->M
Disp "m = "+toString(M)
Disp "y = mx + b, b = y1-m x1"
Disp "b = "+toString(B-M*A)
End
Disp "distance = "+toString(sqrt((C-A)^^2+(D-B)^^2))
Disp "midpoint:"
Disp "("+toString((A+C)/2)+","+toString((B+D)/2)+")"
Pause 
Goto M0
Lbl D1
${restAfter('DERIV', 'D2')}
inString(Str2," AT ")->E
If E=0
Then
Str2->Str5
Goto DA
End
sub(Str2,1,E-1)->Str5
sub(Str2,E+4,length(Str2)-E-3)->Str6
expr(Str6)->A
Goto D3
Lbl D2
ClrHome
Disp "f(X) using X, e.g. X^2"
Input "f(X)=",Str5
Lbl DA
Input "AT X=",A
Lbl D3
String>Equ(Str5,{Y1})
ClrHome
Disp "f(X)="+Str5
Disp "f'("+toString(A)+") ="
Disp nDeriv({Y1},X,A)
Disp "(numeric derivative)"
Disp "f("+toString(A)+") = "+toString({Y1}(A))
Pause 
Goto M0
Lbl I1
${restAfter('INTEG', 'I2')}
inString(Str2," FROM ")->E
inString(Str2," TO ")->K
If E=0 or K=0
Then
Str2->Str5
Goto IA
End
sub(Str2,1,E-1)->Str5
expr(sub(Str2,E+6,K-E-6))->A
expr(sub(Str2,K+4,length(Str2)-K-3))->B
Goto I3
Lbl I2
ClrHome
Disp "f(X) using X, e.g. X^2"
Input "f(X)=",Str5
Lbl IA
Input "FROM X=",A
Input "TO X=",B
Lbl I3
String>Equ(Str5,{Y1})
ClrHome
Disp "Integral of "+Str5
Disp "from "+toString(A)+" to "+toString(B)
Disp "= "+toString(fnInt({Y1},X,A,B))
Disp "(numeric integral)"
Pause 
Goto M0
Lbl FR
ClrHome
Disp "Type a decimal or a"
Disp "fraction like 6/8"
Input "VALUE:",Str2
expr(Str2)->A
ClrHome
Disp Str2+" ="
Disp A>Frac
Disp "decimal: "+toString(A)
If abs(A)>=1 and A!=int(A)
Then
Disp "mixed number:"
Disp toString(int(A))+" and"
Disp abs(A-int(A))>Frac
End
Disp "percent: "+toString(100*A)+"%"
Pause 
Goto M0
Lbl PC
Menu("PERCENT","a% of b",P3,"a is ?% of b",P4,"% change a->b",P5,"b changed a%",P6,"Back",M0)
Lbl P3
ClrHome
Input "A (%)=",A
Input "B=",B
Disp toString(A)+"% of "+toString(B)+" ="
Disp "= "+toString(A/100*B)
Disp "(A/100 * B)"
Pause 
Goto M0
Lbl P4
ClrHome
Input "A=",A
Input "B=",B
Disp toString(A)+" is "+toString(100*A/B)+"%"
Disp "of "+toString(B)
Disp "(A/B * 100)"
Pause 
Goto M0
Lbl P5
ClrHome
Input "FROM A=",A
Input "TO B=",B
Disp "% change = (B-A)/A*100"
Disp "= "+toString((B-A)/A*100)+"%"
If B>=A:Disp "(an increase)"
If B<A:Disp "(a decrease)"
Pause 
Goto M0
Lbl P6
ClrHome
Input "B=",B
Input "A (%), + OR -=",A
Disp toString(B)+" changed by "+toString(A)+"%"
Disp "= B*(1+A/100) ="
Disp B*(1+A/100)
Pause 
Goto M0
Lbl GM
Menu("GEOMETRY","Circle",G4,"Rectangle",G5,"Triangle",G6,"Pythagoras",G7,"Sphere",G8,"Cylinder",G9,"Cone",GA,"Back",M0)
Lbl G4
ClrHome
Input "RADIUS=",R
Disp "area = pi r2 = "+toString(pi*R^^2)
Disp "circumference = 2 pi r"
Disp "= "+toString(2*pi*R)
Disp "diameter = "+toString(2*R)
Pause 
Goto M0
Lbl G5
ClrHome
Input "LENGTH=",A
Input "WIDTH=",B
Disp "area = l w = "+toString(A*B)
Disp "perimeter = 2(l+w) ="
Disp 2*(A+B)
Disp "diagonal = "+toString(sqrt(A^^2+B^^2))
Pause 
Goto M0
Lbl G6
ClrHome
Input "BASE=",B
Input "HEIGHT=",H
Disp "area = .5 b h = "+toString(.5*B*H)
Disp "Sides for perimeter?"
Input "SIDE 2=",C
Input "SIDE 3=",D
Disp "perimeter = "+toString(B+C+D)
Pause 
Goto M0
Lbl G7
ClrHome
Disp "a2 + b2 = c2"
Disp "Enter 0 for the unknown"
Input "LEG A=",A
Input "LEG B=",B
Input "HYP C=",C
If C=0:Disp "c = "+toString(sqrt(A^^2+B^^2))
If B=0:Disp "b = "+toString(sqrt(C^^2-A^^2))
If A=0:Disp "a = "+toString(sqrt(C^^2-B^^2))
Pause 
Goto M0
Lbl G8
ClrHome
Input "RADIUS=",R
Disp "volume = 4/3 pi r3 ="
Disp 4/3*pi*R^^3
Disp "surface = 4 pi r2 ="
Disp 4*pi*R^^2
Pause 
Goto M0
Lbl G9
ClrHome
Input "RADIUS=",R
Input "HEIGHT=",H
Disp "volume = pi r2 h ="
Disp pi*R^^2*H
Disp "surface = 2pi r h+2pi r2"
Disp 2*pi*R*H+2*pi*R^^2
Pause 
Goto M0
Lbl GA
ClrHome
Input "RADIUS=",R
Input "HEIGHT=",H
Disp "volume = 1/3 pi r2 h ="
Disp pi*R^^2*H/3
Disp "slant = sqrt(r2+h2) ="
Disp sqrt(R^^2+H^^2)
Pause 
Goto M0`;

export const mathbot: GeneratedProgram = { name: 'MATHBOT', source };
