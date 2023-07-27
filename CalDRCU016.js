//Скрипт для Калибровки и Верификации Блоков DCU и RCU 
//Подключение библиотек

include("Tektronix.js");
include("AddDRCU016.js");
include("Sic_GetData.js");

// Адреса по USB(COM) и CAN шине

UseCAN = 0;
CANadap = 0;
CAN = 5;
QSU  = 10;
portDevice = 0;

// Данные активных блоков 

Type = 1; 	// Тип блока DCU = 1, RCU = 2 
Unit = 0;	// 
UnitEn = 2;	// Количество блоков
MOD = 0;	// Включение режима калибровки 0 - ВЫКЛ. 1 - ВКЛ.

// Calibration setup parameters

Cal_Rshunt = 1000;	// uOhm
Cal_Points = 10;
Cal_Iterations = 1;
Cal_UseAvg = 1;

// CurrentArray

Cal_IdMin = 100;	
Cal_IdMax = 1100;
Cal_IdStp = 100;

// VoltageRete

Сal_IntPsVmin = 80;	// V
Сal_IntPsVmax = 120;

//CurrentRate

CurrentRateNTest = 0;
CurrentRateN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
CurrentRate = [0.167, 0.25, 0.334, 0.834, 1.667, 2.5, 3.334, 5, 8.334, 10, 16.667]; // in A/us 1, 1.5, 2, 5, 10, 15, 20, 30, 50, 60, 100
CurrentTest = 1100;

// Counters

Сal_CntTotal = 0;
Сal_CntDone = 0;

// Channels

Сal_chMeasureId = 1;
Сal_chSync = 3;

// Results storage

Сal_Id = [];
Сal_Idset = [];
Сal_Irate = [];
Сal_VintPS = [];

// Tektronix data

Сal_IdSc = [];
Сal_Irate = [];

// Relative error

Сal_IdErr = [];
Сal_IdsetErr = [];
Сal_Irate = [];

// Correction

Сal_IdCorr = [];
Сal_IdsetCorr = [];
Сal_IrateCorr = [];

// Data arrays

Сdcu_scatter = [];

//------------------------------------------------------------------------------------------------------------------------------------------
// Включение всех блоков DCU для калибровки и опрос необходимых параметров
function ALL_DCU_SW()		
{
	print("UseCANadap ? (press 'y' or 'n')");
	var key;
		do
		{
			key = readkey();
		}
	while (key != "y" && key != "n");
	if (key == "y")
		UseCAN = 1;
	else if (key == "n")
		UseCAN = 0	
	if (UseCAN == 1)
		{ 
		print("Enter number CANadap")
		CANadap = readline();
		dev.co(CANadap);
		dev.nid(QSU);
		print("Use calibrate MOD? (press 'y' or 'n')");
		var key;
		do
		{
			keym = readkey();
		}
	while (keym != "y" && keym != "n");
	if (keym == "y")
		MOD = 1;
	else if (keym == "n")
		MOD = 0;

		print("Enter number use unit")
		UnitEn = readline();
		for (var a = 0; a < UnitEn ; a++)
			{
			Unit = dev.r(12 + a);
			dev.nid(Unit);
			if (MOD == 1 )
				dev.w(140,1);
			else
				dev.w(140,0);
			dev.c(1);
			dev.nid(QSU);
			} 
		portDevice = Unit;
		}
	else
		{
		print("Enter number RS232")
		portDevice = readline();
		dev.co(portDevice);
		UnitEn = 1;
		}	
} 
//------------------------------------------------------------------------------------------------------------------------------------------
//Функция настройки осцилограффа и выходов
function CAL_Init(portTek, ChannelMeasureId)
{
	if (ChannelMeasureId < 1 || ChannelMeasureId > 4)
	{
		print("Wrong channel numbers");
		return;
	}

	// Copy channel information
	Cal_chMeasureId = ChannelMeasureId;

	// Init device port
	
	
	if(UseCAN == 1)
		{
		if( CANadap == 0)	
			{
			print("Namber CANadap ?");
			CANadap = readline();
			print("CANadap = " + CANadap );
			dev.Connect(CANadap);
			dev.nid(portDevice);
			}
		else
			print("CANadap = " + CANadap );
			dev.Connect(CANadap);
			dev.nid(portDevice);
		}	
	

	else
	{
		dev.Connect(portDevice);
	}	
	
	// Init Tektronix port
	TEK_PortInit(portTek);
	
	// Tektronix init
	for (var i = 1; i <= 4; i++)
	{
		if (i == ChannelMeasureId)
			TEK_ChannelOn(i);
		else
			TEK_ChannelOff(i);
	}
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//Блок формирования одиночного импульса
function DRCU_Pulse(Current, CurrentRate)
{
	if( UnitEn == 1) // Когда проверяется 1 блок
	{
		dev.w(128, Current);
		dev.w(129, CurrentRate);
	
		if(dev.r(192) == 3)
		{
			dev.c(100);
		
			while(dev.r(192) != 4)
			{
				if(dev.r(192) == 1)
				{
					PrintStatus();
					return 0;
				}
			}
		
			dev.c(101);
			sleep(50);
		
			while(dev.r(192) != 3)
			{
				if(dev.r(192) == 1)
				{
					PrintStatus();
					return 0;
				}
			}
		}
		else
			if(dev.r(192) == 1)
			{
				PrintStatus();
				return 0;
			}
	
		return 1;
	}
	else			// Когда проверяется более 1 блока в QRR
	{	
		dev.nid(160);
		while (dev.r(192) !=3)
		{
			sleep(50);
		}	
		for(var i = 0; i < UnitEn; i++)
		{
				
			dev.nid(10);
			Unit = dev.r(12 + i);  
			CONFIG_UNIT(Unit, Current, CurrentRate);

		}
		dev.nid(161);	
		while (dev.r(192) !=4)
		{	
			sleep(50);
		}
		dev.nid(QSU);	
		sleep(50);
		dev.c(22);

	}
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//Блок верификации амплитуды тока (компенсация) 

function CAL_VerifyId(CurrentRateNTest)
{
	//Reset values
	CAL_ResetA();

	// Tektronix init
	CAL_TekInitId();

	// Reload values
	var CurrentArray = CGEN_GetRange(Cal_IdMin, Cal_IdMax, Cal_IdStp);
 
	if (CAL_CollectId(CurrentArray, Cal_Iterations))
		{
		CAL_SaveId("DCU_Id_fixed");
		CAL_SaveId("DCU_Idset_fixed");

		// Plot relative error distribution
		scattern(Cal_IdSc, Cal_IdErr, "Current (in A)", "Error (in %)", "Current relative error");
		scattern(Cal_IdSc, Cal_IdsetErr, "Current (in A)", "Error (in %)", "Current set relative error");
		}
	}	

//-------------------------------------------------------------------------------------------------------------------------------------------
//Блок верификации скорости спада

function CAL_VerifyIrate(CurrentRateNTest)
{		
	CAL_ResetA();
	
	// Tektronix init
	CAL_TekInitIrate();
	
	// Reload values
	var CurrentArray = CGEN_GetRange(Cal_IdMin, Cal_IdMax, Cal_IdStp);
	CAL_CollectIrate(CurrentArray, Cal_Iterations, CurrentRateNTest);		
}



//-------------------------------------------------------------------------------------------------------------------------------------------
//Блок верификации общей

function CAL_VerifyALL()
{

	for (var p = 0; p < 11 ; p++)
	{
		
	CAL_VerifyIrate(p);

	CAL_VerifyId(p);

    }

}
//-------------------------------------------------------------------------------------------------------------------------------------------
//Блок калибровки амплитуды тока (компенсация) (Для 1 блока)

function CAL_CalibrateId(CurrentRateNTest)
{		
	CAL_ResetA();
	CAL_ResetIdCal();
	CAL_ResetIdsetCal();
	
	// Tektronix init
	CAL_TekInitId();

	// Reload values
	var CurrentArray = CGEN_GetRange(Cal_IdMin, Cal_IdMax, Cal_IdStp);

	if (CAL_CollectId(CurrentArray, Cal_Iterations, CurrentRateNTest))
	{
		CAL_SaveId("DCU_Id");
		CAL_SaveIdset("DCU_Idset");

		// Plot relative error distribution
		scattern(Cal_IdSc, Cal_IdErr, "Current (in A)", "Error (in %)", "Current relative error");
		scattern(Cal_IdSc, Cal_IdsetErr, "Current (in A)", "Error (in %)", "Current set relative error");

		// Calculate correction
		Cal_IdCorr = CGEN_GetCorrection2("DCU_Id");
		CAL_SetCoefId(Cal_IdCorr[0], Cal_IdCorr[1], Cal_IdCorr[2]);
		CAL_PrintCoefId();
		
		Cal_IdsetCorr = CGEN_GetCorrection2("DCU_Idset");
		CAL_SetCoefIdset(Cal_IdsetCorr[0], Cal_IdsetCorr[1], Cal_IdsetCorr[2]);
		CAL_PrintCoefIdset();
	}
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//Блок калибровки скорости спада (Для 1 блока)

function CAL_CalibrateIrate(CurrentRateNTest)
{
	CAL_ResetA();
	
	// Tektronix init
	if (Type = 1)
		CAL_TekInitIrateDCU();
	if (Type = 2)
		CAL_TekInitIrateRCU();

	// Reload values
	var CurrentArray = CGEN_GetRange(Cal_IdMin, Cal_IdMax, Cal_IdStp);

	if (CAL_CompensationIrate(CurrentArray, CurrentRateNTest,"DCU_IintPS","DCU_VintPS"))
	{
		// Additional correction
		CAL_CompensationIratecorr("DCU_IintPS","DCU_VintPS","DCU_VintPScorr");
		// Calculate correction
		Cal_IrateCorr = CGEN_GetCorrection2("DCU_VintPScorr");
		CAL_SetCoefIrateCompens(Cal_IrateCorr[0], Cal_IrateCorr[1], Cal_IrateCorr[2], CurrentRateNTest);
		CAL_PrintCoefIrateCompens(CurrentRateNTest);
	}	
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//Импульс управления (Когда проверяется 1 блок)
function DRCU_Debug(PWM, Range)
{
	dev.w(150, Range);
	dev.c(59);
	dev.w(150, PWM);
	dev.w(151, PWM);
	dev.c(60);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//Ресурсный тест (Когда проверяется 1 блок)

function DRCU_Test(N)

{
	for (var i = 0; i < N; i++)
	{
		for (var j = 0; j < 11; j++)
		{
			p("#" + (i * 11 + j) + " / "+ (i + 1) );
			p("№ dI/dt = " + CurrentRateN[j]);
			p("----------------");
			p("");
			if (anykey())
				return;
			DRCU_Pulse(CurrentTest, CurrentRateN[j])
			p("----------------");	
		}
	}
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//одиночное включение-выключение формирования flyback (Когда проверяется 1 блок)

function DRCU_SinglePS(delay)
{ 
dev.w(150,0);
dev.c(55);
dev.w(150,1);
 print("Включение");
 dev.c(54);
 
 sleep (delay);
dev.w(150,0);
 print("Выключение");
 dev.c(54);
 sleep (100);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//Включение разрядки БП (Когда проверяется 1 блок)

function DRCU_PSDischarge() //Включение разрядки БП
{
	dev.w(150,0);
	dev.c(55);
	
while(!anykey())

	{
	dev.w(150,1);
	dev.c(55);
	sleep(100);
	}

	dev.w(150,0);
	dev.c(55);
	
}

//-------------------------------------------------------------------------------------------------------------------------------------------
//Выставление напряжения на внутреннем источнике (Когда проверяется 1 блок)


function DRCU_PSSetpoint(voltage)
{
	dev.w(130,voltage*10);

	while(!anykey())
	{
		p(dev.r(201));
		sleep(2000);
	}
	dev.w(130,0);
}

//-------------------------------------------------------------------------------------------------------------------------------------------
// цикл включения
function DRCU_PulseN(N, Current, CurrentRate)
{
for (var i = 0; i < N; i++)
	{
		DRCU_Pulse(Current, CurrentRate);
		if (anykey())
			return;
	}			
}