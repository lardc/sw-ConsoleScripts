include("Tektronix.js");
include("Common.js")

//Const
DEVICE_TYPE = 1234;//(1234-diode, 5678-thyristor)
ERROR_STATE = 1;
SCTU_READY = 5;
CONFIG_READY = 6;
SURGE_CURRENT_END = 8
SCTU_DS_NONE = 0;
WAVEFORM_SINE = 0xAAAA;
WAVEFORM_TRAPEZE = 0xBBBB;
EDGE_TIME_TRAPEZE = 300;
R_SHUNT_UOHM = 150;
//	
//DataTable addresses
DeviceTypeAdr = 66;
CurrentValueAdr = 64;
StatusAdr = 99;
ErrorAdr = 100;
SCMaxAdr = 103;
Dut_U_Adr = 96;
Dut_I_Adr = 97;
NidSCPC0 = 68;
SCPC_Total = 102;
REG_K_DUT_U = 0;
REG_K_DUT_I = 1;
REG_R_SHUNT = 67;
REG_NID_SCPC_CONFIG = 68;
REG_SCPC_INFO_NID = 69;
REG_K_SHUNT_AMP = 73;
REG_INFO_SCPC_NID = 105;                             //Nid, интересующего блока
REG_INFO_SCPC_PULSE_VALUE = 106;                             //Значение ударного тока, интересующего блока
REG_INFO_SCPC_BAT_VOLTAGE = 107;                             //Напряжение батареи, интересующего блока
REG_INFO_SCPC_DEV_STATE   = 108;                             //Состояние, интересующего блока
REG_INFO_SCPC_DEV_FAULT   = 109;                             //Значение Fault, интересующего блока
REG_INFO_SCPC_DEV_DISABLE = 110;                             //Значение Disable, интересующего блока
REG_INFO_SCPC_DEV_WARNING = 111;                             //Значение Warning, интересующего блока
REG_INFO_SCPC_DEV_PROBLEM = 112;                             //Значение Problem, интересующего блока
REG_WAVEFORM_TYPE = 70;                              		//Задание формы ударного тока (полусинус/трапеция)
REG_TRAPEZE_EDGE_TIME = 71;									//Длительность фронта трапеции
REG_SCPC_DATA_REG = 74;										//Регистр данных для записи в блок SCPC
REG_SCPC_ADDR_REG = 75;										//Регистр адреса регистра для записи данных
REG_SCPC_COMM = 76;											//Регистр команды для вызова ее в блоке SCPC
REG_SCPC_NID = 77;											//Регистр номера NID блока SCPC
//
//Command
ACT_BAT_START_CHARGE = 2;
ACT_SAVE_DT_TO_FLASH = 200;
CURRENT_CONFIG_COM = 100;
CURRENT_START_COM = 101;
ERRORS_CLEAR_COM = 3;
ACT_GET_SCPC_INFO = 102;
ACT_SET_K_SHUNT_AMP = 104;
ACT_SCPC_DATA_REG_WRITE = 105;								//Команда записи в регистр блока SCPC
ACT_SCPC_COMM = 106;										//Команда для вызова команды в блоке SCPC
ACT_SCPC_REG_READ = 107;									//Команда чтения регистра SCPC
//
//Errors
SCPC_NOT_ANS = 1;
SCPC_PULSE_ERROR = 4;
SCPC_ERROR = 5;

//-------------Формирование одиночного импульса амплитудой CurrentValue Ампер----------------------//
function SCTU_Pulse(CurrentValue,WaveForm,EdgeTime)
{	
	//Variables
	var Error;
	
	if(dev.r(StatusAdr)==SCTU_DS_NONE)
	{
		dev.c(ACT_BAT_START_CHARGE);
	}

	//Заряд батареи
	while(dev.r(StatusAdr)!=SCTU_READY)
	{
		sleep(1000);
		if(dev.r(StatusAdr)==ERROR_STATE)
		{
			Error=dev.r(ErrorAdr);
			print("Error="+Error);
			return 0;
		}		
	}
	
	//Запись значения ударного тока
	dev.w(REG_R_SHUNT,R_SHUNT_UOHM);
	dev.w(REG_WAVEFORM_TYPE, WaveForm);
	dev.w(REG_TRAPEZE_EDGE_TIME, EdgeTime);
	dev.w(DeviceTypeAdr, DEVICE_TYPE);
	w32(CurrentValueAdr, CurrentValue);
	sleep(500);
	dev.c(CURRENT_CONFIG_COM);
	sleep(1000);
	while(dev.r(StatusAdr)!=CONFIG_READY)
	{
		sleep(500);
		if(dev.r(StatusAdr)==ERROR_STATE)
		{
			Error=dev.r(ErrorAdr);
			print("Error="+Error);
			return 0;
		}
	}
	
	//Формирование ударного тока
	dev.c(CURRENT_START_COM);
	//
	sleep(500);
	
	while(dev.r(StatusAdr)!=SURGE_CURRENT_END)
	{
		sleep(1000);
		if(dev.r(StatusAdr)==ERROR_STATE)
		{
			Error=dev.r(ErrorAdr);
			print("Error="+Error);
			return 0;
		}
	}
	
	return 1;
}
//-------------------------------------------------------------------------------------------------//

//-------------Формирование синусоидального импульса только 1-м блоком SCPC--------------------------//
function SCPC_SinePulse(Nid,Current)
{
	dev.w(REG_NID_SCPC_CONFIG,Nid);
	SCTU_SinePulseSerial(Current, 1);
	
	SCPCInfo(Nid);
}
//---------------------------------------------------------------------------------------------------//

//-------------Формирование трапецеидального импульса только 1-м блоком SCPC--------------------------//
function SCPC_TrapPulse(Nid,Current)
{
	dev.w(REG_NID_SCPC_CONFIG,Nid);
	SCTU_TrapezePulseSerial(Current, 1);
	
	SCPCInfo(Nid);
}
//---------------------------------------------------------------------------------------------------//


//-------Формирование серии из PulseNumber импульсов синуса амплитудой CurrentValue Ампер-----------------//
function SCTU_SinePulseSerial(CurrentValue, PulseNumber)
{	
	var LSLH_DUT_Current=0;
	var LSLH_DUT_Voltage=0;
	

	for(i=1;i<=PulseNumber;i++)
	{
		//Печать данных на экране	
		print("PulseCount         = "+i);	
		//
		
		//Формируем импульс
		if(SCTU_Pulse(CurrentValue,WAVEFORM_SINE,1000))
		{		
			//Считываем и печатаем измеренные параметры прибора
			LSLH_DUT_Current=dev.Read32(Dut_I_Adr);
			LSLH_DUT_Voltage=(dev.r(Dut_U_Adr)/1000);
			
			print("LSLH DUT current   = "+LSLH_DUT_Current+"A");
			print("LSLH DUT voltage   = "+LSLH_DUT_Voltage+"V");
			print("SCShuntAmplifier   = "+dev.r(113));
			print("");
			//
		}
		else{return;}
	}
}
//-------------------------------------------------------------------------------------------------//

//-------Формирование серии из PulseNumber импульсов трапеции амплитудой CurrentValue Ампер-----------------//
function SCTU_TrapezePulseSerial(CurrentValue, PulseNumber)
{	
	var LSLH_DUT_Current=0;
	var LSLH_DUT_Voltage=0;
	

	for(i=1;i<=PulseNumber;i++)
	{
		//Печать данных на экране	
		print("PulseCount         = "+i);	
		//
		
		//Формируем импульс
		if(SCTU_Pulse(CurrentValue,WAVEFORM_TRAPEZE,EDGE_TIME_TRAPEZE))
		{		
			//Считываем и печатаем измеренные параметры прибора
		LSLH_DUT_Current=dev.Read32(Dut_I_Adr);
		LSLH_DUT_Voltage=(dev.r(Dut_U_Adr)/1000);
		
		print("LSLH DUT current   = "+LSLH_DUT_Current+"A");
		print("LSLH DUT voltage   = "+LSLH_DUT_Voltage+"V");
		print("");
		//
		}
		else{return;}
	}
}
//-------------------------------------------------------------------------------------------------//

//-----------------------------------Информация о блоке SCPC---------------------------------------//
function SCPCInfo(Nid)
{
	dev.w(REG_SCPC_INFO_NID, Nid);
	dev.c(ACT_GET_SCPC_INFO);
	print("SCPC Nid = "+dev.r(REG_INFO_SCPC_NID));
	print("SC value = "+dev.r(REG_INFO_SCPC_PULSE_VALUE));
	print("BAT volt = "+dev.r(REG_INFO_SCPC_BAT_VOLTAGE));
	print("State    = "+dev.r(REG_INFO_SCPC_DEV_STATE));
	print("Fault    = "+dev.r(REG_INFO_SCPC_DEV_FAULT));
	print("Disable  = "+dev.r(REG_INFO_SCPC_DEV_DISABLE));
	print("Warning  = "+dev.r(REG_INFO_SCPC_DEV_WARNING));
	print("Problem  = "+dev.r(REG_INFO_SCPC_DEV_PROBLEM));
}
//-------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------//
function SCPC_WriteReg(Nid,Address,Data)
{
	dev.w(REG_SCPC_NID,Nid);
	dev.w(REG_SCPC_ADDR_REG,Address);
	dev.w(REG_SCPC_DATA_REG,Data);
	dev.c(ACT_SCPC_DATA_REG_WRITE);
}
//-------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------//
function SCPC_ReadReg(Nid,Address)
{
	dev.w(REG_SCPC_NID,Nid);
	dev.w(REG_SCPC_ADDR_REG,Address);
	dev.c(ACT_SCPC_REG_READ);
	print(dev.r(REG_SCPC_DATA_REG));
}
//-------------------------------------------------------------------------------------------------//

//-------------------------------------------------------------------------------------------------//
function SCPC_CommCall(Nid,Command)
{
	dev.w(REG_SCPC_NID,Nid);
	dev.w(REG_SCPC_COMM,Command);
	dev.c(ACT_SCPC_COMM);
}
//-------------------------------------------------------------------------------------------------//

//--------------------------------Установка усиления SCShuntAmplifier------------------------------//
function SCSA_K_Set(Ky)
{
	dev.w(REG_K_SHUNT_AMP,Ky);
	dev.c(ACT_SET_K_SHUNT_AMP);
}
//-------------------------------------------------------------------------------------------------//