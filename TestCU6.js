include("PrintStatus.js")

function CU6_NONE ()
{
	if (REG_DEV_STATE == 0)
	{
		dev.c(1);	
	}

	dev.c(120);
}
function CU6_GETE (TYPES,POS,CASES)
{
	if (REG_DEV_STATE == 0)
	{
		dev.c(1);	
	}

	dev.w(70,TYPES);
	dev.w(71,POS);
	dev.w(72,CASES);
	dev.c(121);
}

function CU6_SL (TYPES,POS,CASES)
{
	if (REG_DEV_STATE == 0)
	{
		dev.c(1);	
	}

	dev.w(70,TYPES);
	dev.w(71,POS);
	dev.w(72,CASES);
	dev.c(122);
}

function CU6_BV_D (TYPES,POS,CASES)
{
	if (REG_DEV_STATE == 0)
	{
		dev.c(1);	
	}

	dev.w(70,TYPES);
	dev.w(71,POS);
	dev.w(72,CASES);
	dev.c(123);
}

function CU6_BV_R (TYPES,POS,CASES)
{
	if (REG_DEV_STATE == 0)
	{
		dev.c(1);	
	}

	dev.w(70,TYPES);
	dev.w(71,POS);
	dev.w(72,CASES);
	dev.c(124);
}
function CU6_NO_PE ()
{
	if (REG_DEV_STATE == 0)
	{
		dev.c(1);	
	}

	dev.c(125);
}
function CU6_GETE_SL (TYPES,POS,CASES)
{
	if (REG_DEV_STATE == 0)
	{
		dev.c(1);	
	}
	dev.w(70,TYPES);
	dev.w(71,POS);
	dev.w(72,CASES);
	dev.c(126);
}