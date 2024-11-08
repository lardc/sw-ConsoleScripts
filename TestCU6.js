include("PrintStatus.js")

// Type
DIRECT	= 0
MT1		= 1
MD1		= 2
MT3		= 3
MT4		= 4
MT5		= 5
MD3		= 6
MD4		= 7
MD5		= 8
MTD3	= 9
MDT3	= 10
MTD4	= 11
MDT4	= 12
MTD5	= 13
MDT5	= 14
REVERSE	= 15
MD3_BP	= 22

// Pos
// 1 - Первая позиция
// 2 - Вторая позиция

// Case
A2		= 1001
B1		= 1006
C1		= 1002
D0		= 1005
E0		= 1003
F1		= 1004
ADAP	= 1007
E2M		= 1008

function CU6_NONE ()
{
	if (dev.r(96) == 0)
		dev.c(1);

	dev.c(120);
}

function CU6_GATE (Type, Pos, Case)
{
	if (dev.r(96) == 0)
		dev.c(1);

	dev.w(70,Type);
	dev.w(71,Pos);
	dev.w(72,Case);
	dev.c(121);
}

function CU6_SL (Type, Pos, Case)
{
	if (dev.r(96) == 0)
		dev.c(1);

	dev.w(70,Type);
	dev.w(71,Pos);
	dev.w(72,Case);
	dev.c(122);
}

function CU6_BV_D (Type, Pos, Case)
{
	if (dev.r(96) == 0)
		dev.c(1);

	dev.w(70,Type);
	dev.w(71,Pos);
	dev.w(72,Case);
	dev.c(123);
}

function CU6_BV_R (Type, Pos, Case)
{
	if (dev.r(96) == 0)
		dev.c(1);

	dev.w(70,Type);
	dev.w(71,Pos);
	dev.w(72,Case);
	dev.c(124);
}

function CU6_NO_PE ()
{
	if (dev.r(96) == 0)
		dev.c(1);

	dev.c(125);
}

function CU6_GATE_SL (Type, Pos, Case)
{
	if (dev.r(96) == 0)
		dev.c(1);

	dev.w(70,Type);
	dev.w(71,Pos);
	dev.w(72,Case);
	dev.c(126);
}